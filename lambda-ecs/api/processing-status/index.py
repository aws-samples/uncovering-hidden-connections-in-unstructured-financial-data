import json
import boto3
import os
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ["DDBTBL_PROCESSING_STATUS"])

def decimal_default(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, Decimal):
        return int(obj)
    raise TypeError

def lambda_handler(event, context):
    try:
        http_method = event.get('httpMethod', 'GET')
        
        if http_method == 'GET':
            return handle_get_request()
        elif http_method == 'DELETE':
            return handle_delete_request()
        else:
            return {
                'statusCode': 405,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'success': False,
                    'error': f'Method {http_method} not allowed'
                })
            }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'success': False,
                'error': str(e)
            }, default=decimal_default)
        }

def get_cors_headers():
    """Return CORS headers"""
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key'
    }

def handle_get_request():
    """Handle GET request to retrieve all processing status records"""
    # Get all processing status records
    response = table.scan()
    items = response.get('Items', [])
    
    # Sort by datetime_started (most recent first)
    items.sort(key=lambda x: x.get('datetime_started', ''), reverse=True)
    
    # Calculate progress percentage for each item
    for item in items:
        completed_steps = int(item.get('completed_step_count', 0))
        total_steps = int(item.get('total_step_count', 1))
        progress_percentage = round((completed_steps / total_steps) * 100) if total_steps > 0 else 0
        item['progress_percentage'] = progress_percentage
        
        # Add status based on progress
        if progress_percentage >= 100:
            item['status'] = 'completed'
        elif progress_percentage > 0:
            item['status'] = 'processing'
        else:
            item['status'] = 'pending'
    
    return {
        'statusCode': 200,
        'headers': get_cors_headers(),
        'body': json.dumps({
            'success': True,
            'data': items
        }, default=decimal_default)
    }

def handle_delete_request():
    """Handle DELETE request to remove all processing status records"""
    try:
        # First, scan to get all items
        response = table.scan()
        items = response.get('Items', [])
        
        if not items:
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'success': True,
                    'message': 'No records to delete',
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
            'headers': get_cors_headers(),
            'body': json.dumps({
                'success': True,
                'message': f'Successfully deleted {deleted_count} processing records',
                'deleted_count': deleted_count
            })
        }
        
    except Exception as e:
        print(f"Error deleting records: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'success': False,
                'error': f'Failed to delete records: {str(e)}'
            })
        }