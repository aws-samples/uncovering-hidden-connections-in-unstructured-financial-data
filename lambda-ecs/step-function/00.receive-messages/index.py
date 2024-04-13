import json
import boto3
import os

sqs = boto3.client('sqs')

def lambda_handler(event, context):
    queue_url = queue_url = sqs.get_queue_url(QueueName=os.environ["QUEUE_NAME"])['QueueUrl']
    
    response = sqs.receive_message(
        QueueUrl=queue_url,
        MaxNumberOfMessages=1,
    )
    messages = response.get('Messages', [])
    
    if len(messages) > 0:
        return {
            'statusCode': 200,
            'Messages': messages
        }
    else:
        return {'statusCode': 200}