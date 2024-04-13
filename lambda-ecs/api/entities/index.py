import json
import os

from connectionsinsights.neptune import (
    getEntities,
    updateEntityInterested,
    GraphConnect
)

cors_headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
}
    
def lambda_handler(event, context):
    # If it's a GET request, extract out the list of entities
    httpMethod = event["httpMethod"]
    
    if httpMethod == "GET":
        g, connection = GraphConnect()
        entities = getEntities()
        connection.close()
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps(entities)
        }
    # If it's a POST request, update the specified entity's INTERESTED value based on ID
    elif httpMethod == "POST":
        try:
            g, connection = GraphConnect()
            body = json.loads(event["body"])
            updateEntityInterested(body["ID"], body["INTERESTED"])
            connection.close()
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({'message': 'INTERESTED flag updated successfully'})
            }
        except Exception as e:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': f'Invalid request body - {str(e)}'})
            }
    else:
        return {
            'statusCode': 400,
            'headers': cors_headers,
            'body': json.dumps({'error': 'Invalid HTTP method'})
        }

