import json
import os
from connectionsinsights.neptune import GraphConnect

cors_headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,DELETE'
}

def lambda_handler(event, context):
    """
    Lambda function to purge all entities and relationships from Neptune database
    WARNING: This is a destructive operation that cannot be undone
    """
    
    try:
        http_method = event.get('httpMethod', 'DELETE')
        
        if http_method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': ''
            }
        elif http_method == 'DELETE':
            return handle_purge_entities()
        else:
            return {
                'statusCode': 405,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': False,
                    'error': f'Method {http_method} not allowed. Use DELETE.'
                })
            }
        
    except Exception as e:
        print(f"Error purging entities: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'success': False,
                'error': f'Internal server error: {str(e)}'
            })
        }

def handle_purge_entities():
    """Handle DELETE request to purge all entities and relationships from Neptune"""
    try:
        g, connection = GraphConnect()
        
        # Count entities and relationships before deletion
        vertex_count = g.V().count().next()
        edge_count = g.E().count().next()
        
        if vertex_count == 0 and edge_count == 0:
            connection.close()
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    'message': 'No entities or relationships to purge',
                    'deleted_vertices': 0,
                    'deleted_edges': 0
                })
            }
        
        # Drop all edges first (to avoid constraint issues)
        print(f"Purging {edge_count} edges from Neptune...")
        g.E().drop().iterate()
        
        # Drop all vertices
        print(f"Purging {vertex_count} vertices from Neptune...")
        g.V().drop().iterate()
        
        # Verify deletion
        remaining_vertices = g.V().count().next()
        remaining_edges = g.E().count().next()
        
        connection.close()
        
        if remaining_vertices == 0 and remaining_edges == 0:
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    'message': f'Successfully purged all entities and relationships from knowledge graph',
                    'deleted_vertices': vertex_count,
                    'deleted_edges': edge_count,
                    'warning': 'This was a destructive operation - all knowledge graph data has been permanently deleted'
                })
            }
        else:
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': False,
                    'error': f'Purge incomplete. Remaining: {remaining_vertices} vertices, {remaining_edges} edges',
                    'deleted_vertices': vertex_count - remaining_vertices,
                    'deleted_edges': edge_count - remaining_edges
                })
            }
        
    except Exception as e:
        print(f"Error purging entities: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'success': False,
                'error': f'Failed to purge entities: {str(e)}'
            })
        }