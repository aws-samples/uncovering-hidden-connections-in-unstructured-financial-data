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

# pulls out all news record from dynamodb table
# for each record, take its id, and insert it into SQS queue
def lambda_handler(event, context):
    response = table.scan()
    items = response['Items']
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
    return {
        'statusCode': 200,
        'body': json.dumps('Success'),
        'headers': cors_headers
    }
