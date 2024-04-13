import json
import os

from connectionsinsights.dynamodb import (
    getN,
    setN,
)

cors_headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
}

def lambda_handler(event, context):
    httpMethod = event['httpMethod']

    if httpMethod == 'GET':
        # If it's a GET request, retrieve and return the value of N
        value_of_n = getN()

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'N': value_of_n})
        }

    elif httpMethod == 'POST':
        # If it's a POST request, update the value of N with the value from the request body
        try:
            body = json.loads(event['body'])
            n_value = body['N']
            setN(n_value)
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({'message': 'N value updated successfully'})
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
