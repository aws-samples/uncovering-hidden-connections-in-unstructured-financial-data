import json
import boto3
import os

cors_headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
}
    
def lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(os.environ["DDBTBL_NEWS"])
    httpMethod = event['httpMethod']
    if httpMethod == "GET":
        response = table.scan()
        items = response.get('Items', [])
    
        # Extract relevant news data
        news_data = []
        for item in items:
            news_item = {
                'id': item.get('id'),
                'date': item.get('date'),
                'title': item.get('title'),
                'text': item.get('text'),
                'interested': item.get('interested', "NO"),
                'paths': item.get('paths', [])
            }
            news_data.append(news_item)
    
        # Return the extracted news data as JSON
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps(news_data)
        }
    else:
        return {
            'statusCode': 400,
            'headers': cors_headers,
            'body': json.dumps({'error': 'Invalid HTTP method'})
        }
    
    
