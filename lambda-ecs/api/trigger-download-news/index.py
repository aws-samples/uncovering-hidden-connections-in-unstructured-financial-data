import boto3
import os
import json

cors_headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
}

def lambda_handler(event, context):
    newsapikey = event["queryStringParameters"]["newsapikey"] if "newsapikey" in event["queryStringParameters"] else None

    if newsapikey is None:
        return {
            'statusCode': 400,
            'headers': cors_headers,
            'body': 'Missing newsapikey parameter.'
        }
    else:
        client = boto3.client('lambda')
        response = client.invoke(
            FunctionName=os.environ['DOWNLOAD_NEWS_ARTICLES_LAMBDA_NAME'],
            InvocationType='Event',
            Payload=json.dumps({'newsapikey': newsapikey})
        )    
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': 'News articles downloaded successfully.'
        }

