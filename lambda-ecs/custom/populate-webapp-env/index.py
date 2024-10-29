import json
import os
import boto3

apikey_id = os.environ["APIKEY_ID"]
api_endpoint = os.environ["API_ENDPOINT"]
webapp_s3bucket = os.environ["WEBAPP_S3BUCKET"]

apigw = boto3.client('apigateway')
s3 = boto3.client('s3')

def lambda_handler(event, context):
    response = apigw.get_api_key(apiKey=apikey_id,includeValue=True)
    api_key_value = response['value']
    
    environmentJSON = {
        'API_GATEWAY_ENDPOINT' : api_endpoint,
        'API_GATEWAY_APIKEY' : api_key_value
    }
    
    content = f"window.env = {environmentJSON}"
    
    s3.put_object(Key="env.js", Bucket=webapp_s3bucket, Body=content)
    
    return {
        'statusCode': 200,
        'body': json.dumps('Success')
    }
