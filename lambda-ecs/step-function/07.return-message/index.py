import boto3
import os

sqs = boto3.client('sqs')

def lambda_handler(event, context):

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