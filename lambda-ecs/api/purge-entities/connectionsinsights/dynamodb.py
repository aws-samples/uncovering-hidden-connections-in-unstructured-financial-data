import os
import boto3


# ██████  ██    ██ ███    ██  █████  ███    ███  ██████  ██████  ██████  
# ██   ██  ██  ██  ████   ██ ██   ██ ████  ████ ██    ██ ██   ██ ██   ██ 
# ██   ██   ████   ██ ██  ██ ███████ ██ ████ ██ ██    ██ ██   ██ ██████  
# ██   ██    ██    ██  ██ ██ ██   ██ ██  ██  ██ ██    ██ ██   ██ ██   ██ 
# ██████     ██    ██   ████ ██   ██ ██      ██  ██████  ██████  ██████  

# Helper function to retrieve the value of N from DynamoDB
def getN():
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(os.environ["DDBTBL_SETTINGS"])
    response = table.get_item(Key={'id': 'N'})
    if 'Item' in response:
        return int(response['Item']['value'])
    else:
        return 2

# Helper function to update the value of N in DynamoDB
def setN(n):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(os.environ["DDBTBL_SETTINGS"])
    table.update_item(
        Key={'id': 'N'},
        UpdateExpression='SET #value = :val',
        ExpressionAttributeNames={'#value': 'value'},
        ExpressionAttributeValues={':val': n}
    )

