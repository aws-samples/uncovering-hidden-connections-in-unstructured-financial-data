import boto3
import os

from connectionsinsights.utils import (
    mark_processing_failed
)

sqs = boto3.client('sqs')

def lambda_handler(event, context):
    # Mark processing as failed since this lambda is called on errors
    processing_id = event.get("processing_id")
    if processing_id:
        error_message = event.get("Error", {}).get("Cause", "Step function execution failed")
        mark_processing_failed(processing_id, error_message)

    queue_url = sqs.get_queue_url(QueueName=os.environ["QUEUE_NAME"])['QueueUrl']

    try:
        response = sqs.change_message_visibility(
            QueueUrl=queue_url,
            ReceiptHandle=event["ReceiptHandle"],
            VisibilityTimeout=0
        )
    except Exception as e:
        print(e)
   

    return {
        "message": "message returned back to queue",
    }