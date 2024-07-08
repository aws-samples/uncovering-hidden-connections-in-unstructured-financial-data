import json
import boto3
import os
import uuid

sqs = boto3.client('sqs', region_name=os.environ["AWS_REGION"])
queue_url = sqs.get_queue_url(QueueName=os.environ["QUEUE_NAME"])['QueueUrl']
step_functions = boto3.client('stepfunctions', region_name=os.environ["AWS_REGION"])
state_machine_arn = os.environ['STATE_MACHINE_ARN']

def lambda_handler(event, context):
    try:
        response = sqs.receive_message(
            QueueUrl=queue_url,
            MaxNumberOfMessages=1,
            WaitTimeSeconds=1
        )
        s3_key = json.loads(response["Messages"][0]["Body"])["S3_KEY"]
        execution_input = {"Messages": response["Messages"]}
        response = step_functions.start_execution(
            stateMachineArn=state_machine_arn,
            name=s3_key+"_"+str(uuid.uuid4()),
            input=json.dumps(execution_input)
        )
    except Exception as e:
        print(e)
        pass # will encounter key error for "Messages" when message is in visibility timeout
    
    return {
        'statusCode': 200,
        'body': json.dumps('Success!')
    }
