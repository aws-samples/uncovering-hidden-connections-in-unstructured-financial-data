import json
import boto3
import os
from boto3.dynamodb.conditions import Attr

cors_headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,DELETE'
}

def lambda_handler(event, context):
    """
    Lambda function to purge all processed news from DynamoDB
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
            return handle_purge_news()
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
        print(f"Error purging news: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'success': False,
                'error': f'Internal server error: {str(e)}'
            })
        }

def handle_purge_news():
    """Handle DELETE request to purge all news records from DynamoDB"""
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(os.environ["DDBTBL_NEWS"])
        
        # First, scan to get all items
        response = table.scan()
        items = response.get('Items', [])
        
        # Handle pagination if there are more items
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response.get('Items', []))
        
        if not items:
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    'message': 'No news records to purge',
                    'deleted_count': 0
                })
            }
        
        # Delete all items in batches (DynamoDB batch_writer handles batching automatically)
        deleted_count = 0
        with table.batch_writer() as batch:
            for item in items:
                batch.delete_item(Key={'id': item['id']})
                deleted_count += 1
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'message': f'Successfully purged {deleted_count} news records from database',
                'deleted_count': deleted_count,
                'warning': 'This was a destructive operation - all processed news data has been permanently deleted'
            })
        }
        
    except Exception as e:
        print(f"Error purging news records: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'success': False,
                'error': f'Failed to purge news records: {str(e)}'
            })
        }