import json
import urllib.parse
import boto3 
import uuid
import os

from connectionsinsights.bedrock import (
    queryBedrockStreaming,
    getTextWithinTags,
    cleanJSONString,
    uppercase,
)

from connectionsinsights.dynamodb import (
    getN,
)

from connectionsinsights.neptune import (
    findVertexWithinNHops,
    GraphConnect  
)

def qb_extractDataFromArticle(article):
    format = """
[{
"NAME": "<COMPANY_OR_PERSON_FULL_NAME>", "LABEL": "COMPANY_OR_PERSON", "INDUSTRY": "<INDUSTRY_OF_COMPANY_OR_INDUSTRY_THE_PERSON_WORKED_IN>", SENTIMENT": "<POSITIVE_OR_NEUTRAL_OR_NEGATIVE>",
"RELATIONSHIPS": [
    { "RELATED_ENTITY": "<RELATED_COMPANY_OR_PERSON_FULL_NAME>", "LABEL": "COMPANY_OR_PERSON", "RELATIONSHIP": "<ROLE_OF_RELATIONSHIP>" }
]
}]
"""

    messages = [
        {"role":"user", "content": """
Here is a news article:
{article}

Extract out any companies or people mentioned in the article, their sentiment, and their relationships with any entities mentioned in the article.
Return empty string if any value is not available.
Print them out in a JSON array in the following format within <entities></entities> tag:
{format}
         """.format(article=article, format=format)},
         {"role":"assistant", "content": ""}
    ]
    
    completion = queryBedrockStreaming(messages)
    entities = getTextWithinTags(completion, "entities")
    
    return cleanJSONString(entities)

def processArticle(article):
    g, connection = GraphConnect()
    dynamodb = boto3.resource('dynamodb')
    value_of_n = getN() 
    entities = qb_extractDataFromArticle(article)
    entities = uppercase(json.loads(entities))
    table = dynamodb.Table(os.environ["DDBTBL_NEWS"])
    paths = []
    for entity in entities:
        pathsArray = findVertexWithinNHops(
            entity["LABEL"],
            entity["NAME"],
            { "INDUSTRY": entity["INDUSTRY"] if "INDUSTRY" in entity else "" }, 
            entity["RELATIONSHIPS"] if "RELATIONSHIPS" in entity else [], 
            value_of_n
        )
        if len(pathsArray) > 0:
            paths.append({
                "name": entity["NAME"],
                "path": pathsArray,
                "sentiment": entity["SENTIMENT"]  
            })
    table.put_item(
        Item={
            'id': str(uuid.uuid4()),
            'date': getTextWithinTags(article, "date"),
            'title': getTextWithinTags(article, "title"),
            'text': getTextWithinTags(article, "text"),
            'interested': "YES" if len(paths) > 0 else "NO",
            'paths': paths
        }
    )
    connection.close()

def lambda_handler(event, context):
    try:
        body = json.loads(event["Records"][0]["body"])
        s3_bucket = body["Records"][0]["s3"]["bucket"]["name"]
        s3_key = body["Records"][0]["s3"]["object"]["key"]
        
        s3 = boto3.client('s3')
        s3_key_decoded = urllib.parse.unquote_plus(s3_key)
        response = s3.get_object(Bucket=s3_bucket, Key=s3_key_decoded)
        file_content = response['Body'].read().decode('utf-8')
        
        processArticle(file_content)
        s3.delete_object(Bucket=s3_bucket, Key=s3_key_decoded)
        
        return {
            'statusCode': 200,
            'body': json.dumps('Hello from Lambda!')
        }
    except Exception as e: # clear unintended queue messages such as s3:TestEvent
        print(e)
        return {
            'statusCode': 200,
            'body': event
        }