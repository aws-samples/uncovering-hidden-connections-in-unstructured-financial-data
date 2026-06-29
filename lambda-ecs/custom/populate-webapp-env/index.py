import json
import os
import boto3

apikey_id = os.environ["APIKEY_ID"]
api_endpoint = os.environ["API_ENDPOINT"]
# Remove protocol part (https:// or http://) from the API endpoint
if api_endpoint.startswith("https://"):
    api_endpoint = api_endpoint[8:]  # Remove "https://"
elif api_endpoint.startswith("http://"):
    api_endpoint = api_endpoint[7:]   # Remove "http://"
webapp_s3bucket = os.environ["WEBAPP_S3BUCKET"]
cognito_user_pool_id = os.environ.get("COGNITO_USER_POOL_ID", "")
cognito_client_id = os.environ.get("COGNITO_CLIENT_ID", "")
cognito_region = os.environ.get("COGNITO_REGION", "")

apigw = boto3.client('apigateway')
s3 = boto3.client('s3')

def lambda_handler(event, context):
    response = apigw.get_api_key(apiKey=apikey_id,includeValue=True)
    api_key_value = response['value']
    
    environmentJSON = {
        'API_GATEWAY_ENDPOINT' : api_endpoint,
        'API_GATEWAY_APIKEY' : api_key_value,
        'COGNITO_USER_POOL_ID': cognito_user_pool_id,
        'COGNITO_CLIENT_ID': cognito_client_id,
        'COGNITO_REGION': cognito_region,
    }
    
    content = f"window.env = {json.dumps(environmentJSON)}"
    
    s3.put_object(Key="env.js", Bucket=webapp_s3bucket, Body=content)
    
    return {
        'statusCode': 200,
        'body': json.dumps('Success')
    }
