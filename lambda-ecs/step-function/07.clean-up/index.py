import boto3
import os
import urllib.parse

from connectionsinsights.utils import (
    increment_processing_status
)

sqs = boto3.client('sqs')
s3 = boto3.client('s3')

def lambda_handler(event, context):
    # Get processing_id and increment status to final step (3 -> 4)
    processing_id = event.get("processing_id")
    if processing_id:
        increment_processing_status(processing_id, is_final_step=True)

    queue_url = sqs.get_queue_url(QueueName=os.environ["QUEUE_NAME"])['QueueUrl']

    try:
        response = sqs.delete_message(
            QueueUrl=queue_url,
            ReceiptHandle=event["ReceiptHandle"]
        )
    except Exception as e:
        print(e)

    try:
        response = s3.delete_object(
            Bucket=event["Bucket"],
            Key=urllib.parse.unquote_plus(event["Key"])
        )
    except Exception as e:
        print(e)

    return {
        "message": "Clean up successful",
    }