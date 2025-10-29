import json
import os
import boto3
from botocore.exceptions import ClientError

from connectionsinsights.neptune import (
    GraphConnect,
    getEntities,
    findVertexByLabelandName,
    formatResultsFindVertex
)

cors_headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
}

def lambda_handler(event, context):
    httpMethod = event["httpMethod"]
    
    try:
        if httpMethod == "GET":
            # Handle different GET operations based on query parameters
            query_params = event.get("queryStringParameters", {}) or {}
            
            if "search" in query_params:
                # Search for entities by name
                search_term = query_params["search"]
                label = query_params.get("label", None)  # Optional filter by label
                
                g, connection = GraphConnect()
                
                if label:
                    # Search within specific label
                    results = findVertexByLabelandName(g, label, search_term, False)
                else:
                    # Search across all entities - case insensitive substring search
                    from gremlin_python.process.traversal import TextP
                    # Use case-insensitive regex pattern for substring search
                    regex_pattern = r'(?i).*' + search_term + r'.*'
                    results = g.V().has('NAME', TextP.regex(regex_pattern)).elementMap().toList()
                    results = formatResultsFindVertex(g, results)
                
                connection.close()
                
                return {
                    'statusCode': 200,
                    'headers': cors_headers,
                    'body': json.dumps(results)
                }
                
            elif "entity_id" in query_params:
                # Get entity details and its immediate relationships
                entity_id = query_params["entity_id"]
                
                g, connection = GraphConnect()
                
                # Get entity details
                entity_result = g.V(entity_id).elementMap().toList()
                if not entity_result:
                    connection.close()
                    return {
                        'statusCode': 404,
                        'headers': cors_headers,
                        'body': json.dumps({'error': 'Entity not found'})
                    }
                
                entity = entity_result[0]
                
                # Get relationships (both incoming and outgoing)
                from gremlin_python.process.traversal import T, Direction
                from gremlin_python.process.graph_traversal import __
                
                relationships = []
                
                # Outgoing relationships
                outgoing = g.V(entity_id).outE().as_('edge').inV().as_('target').select('edge', 'target').by(__.elementMap()).toList()
                for rel in outgoing:
                    edge = rel["edge"]
                    target = rel["target"]
                    relationships.append({
                        "id": edge[T.id],
                        "type": "outgoing",
                        "label": edge[T.label],
                        "source": {
                            "id": entity[T.id],
                            "name": entity["NAME"],
                            "label": entity[T.label]
                        },
                        "target": {
                            "id": target[T.id],
                            "name": target["NAME"],
                            "label": target[T.label]
                        },
                        "properties": {k: v for k, v in edge.items() if k not in [Direction.OUT, Direction.IN, T.id, T.label]}
                    })
                
                # Incoming relationships
                incoming = g.V(entity_id).inE().as_('edge').outV().as_('source').select('edge', 'source').by(__.elementMap()).toList()
                for rel in incoming:
                    edge = rel["edge"]
                    source = rel["source"]
                    relationships.append({
                        "id": edge[T.id],
                        "type": "incoming",
                        "label": edge[T.label],
                        "source": {
                            "id": source[T.id],
                            "name": source["NAME"],
                            "label": source[T.label]
                        },
                        "target": {
                            "id": entity[T.id],
                            "name": entity["NAME"],
                            "label": entity[T.label]
                        },
                        "properties": {k: v for k, v in edge.items() if k not in [Direction.OUT, Direction.IN, T.id, T.label]}
                    })
                
                connection.close()
                
                # Count unexplored relationships
                relationship_count = len(relationships)
                
                response = {
                    "entity": {
                        "id": entity[T.id],
                        "name": entity["NAME"],
                        "label": entity[T.label],
                        "properties": {k: v for k, v in entity.items() if k not in [T.id, T.label, 'NAME']},
                        "relationship_count": relationship_count
                    },
                    "relationships": relationships
                }
                
                return {
                    'statusCode': 200,
                    'headers': cors_headers,
                    'body': json.dumps(response)
                }
            
            else:
                # Default: return all entities for initial load
                g, connection = GraphConnect()
                entities = getEntities(g)
                connection.close()
                
                return {
                    'statusCode': 200,
                    'headers': cors_headers,
                    'body': json.dumps(entities)
                }
        
        else:
            return {
                'statusCode': 405,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Method not allowed'})
            }
            
    except Exception as e:
        print(f"Error in relationships API: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'error': f'Internal server error: {str(e)}'})
        }