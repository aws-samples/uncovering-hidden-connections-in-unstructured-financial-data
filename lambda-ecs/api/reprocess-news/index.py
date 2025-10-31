import json
import os
import boto3

cors_headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
}

sqs = boto3.client('sqs')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ["DDBTBL_NEWS"])

def lambda_handler(event, context):
    # Check if a specific news ID is provided in query parameters
    query_params = event.get('queryStringParameters', {}) or {}
    news_id = query_params.get('id')
    
    if news_id:
        # Reprocess single news item
        try:
            # Check if the news item exists
            response = table.get_item(Key={'id': news_id})
            if 'Item' not in response:
                return {
                    'statusCode': 404,
                    'body': json.dumps({'error': 'News item not found'}),
                    'headers': cors_headers
                }
            
            # Send the specific news ID to SQS queue for reprocessing
            sqs.send_message(
                QueueUrl=os.environ["NEWS_QUEUE"],
                MessageBody=news_id
            )
            
            # Mark the news item as hidden during reprocessing
            table.update_item(
                Key={'id': news_id},  
                UpdateExpression="SET hide_news = :val",
                ExpressionAttributeValues={':val': "TRUE"}
            )
            
            return {
                'statusCode': 200,
                'body': json.dumps({'message': f'News item {news_id} queued for reprocessing'}),
                'headers': cors_headers
            }
            
        except Exception as e:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': f'Error reprocessing news item: {str(e)}'}),
                'headers': cors_headers
            }
    else:
        # Reprocess all news items (existing functionality)
        try:
            response = table.scan()
            items = response['Items']
            processed_count = 0
            
            for item in items:
                sqs.send_message(
                    QueueUrl=os.environ["NEWS_QUEUE"],
                    MessageBody=item['id']
                )
                table.update_item(
                    Key={'id': item['id']},  
                    UpdateExpression="SET hide_news = :val",
                    ExpressionAttributeValues={':val': "TRUE"}
                )
                processed_count += 1
            
            return {
                'statusCode': 200,
                'body': json.dumps({'message': f'All {processed_count} news items queued for reprocessing'}),
                'headers': cors_headers
            }
            
        except Exception as e:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': f'Error reprocessing all news: {str(e)}'}),
                'headers': cors_headers
            }
