import json
import boto3
import os

def lambda_handler(event, context):
    s3_bucket = event['Records'][0]['s3']['bucket']['name']
    s3_key = event['Records'][0]['s3']['object']['key']

    sqs = boto3.client('sqs', region_name=os.environ["AWS_REGION"])
    queue_url = sqs.get_queue_url(QueueName=os.environ["QUEUE_NAME"])['QueueUrl']

    response = sqs.send_message(
        QueueUrl=queue_url,
        MessageGroupId="ingestion",
        MessageBody=json.dumps({
          "S3_BUCKET": s3_bucket,
          "S3_KEY": s3_key
        })
    )

    return {
        'statusCode': 200,
        'body': json.dumps('Success!')
    }
