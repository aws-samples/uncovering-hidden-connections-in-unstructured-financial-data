import json
import urllib.parse
import boto3 
import uuid
import os
import time
from datetime import datetime

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

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ["DDBTBL_NEWS"])

def qb_extractDataFromArticle(article):
    format = """
[{
"NAME": "<COMPANY_OR_PERSON_FULL_NAME>", "LABEL": "COMPANY_OR_PERSON", "INDUSTRY": "<INDUSTRY_OF_COMPANY_OR_INDUSTRY_THE_PERSON_WORKED_IN>", "SENTIMENT": "<POSITIVE_OR_NEUTRAL_OR_NEGATIVE>", "SENTIMENT_EXPLANATION": "<EXPLANATION_OF_SENTIMENT_IDENTIFIED>",
"RELATIONSHIPS": [
    { "RELATED_ENTITY": "<RELATED_COMPANY_OR_PERSON_FULL_NAME>", "LABEL": "COMPANY_OR_PERSON", "RELATIONSHIP": "<ROLE_OF_RELATIONSHIP>" }
]
}]
"""

    messages = [
        {"role":"user", "content": """
Here is a news article:
<article>
{article}
</article>

Extract out any companies or people mentioned in the article, their sentiment, and their relationships with any entities mentioned in the article.
For any attributes that you cannot determine, attempt to derive it using context from surrounding text.  Otherwise return empty string.
Print them out in a JSON array in the following format within <entities></entities> tag:
{format}
         """.format(article=article, format=format)},
         {"role":"assistant", "content": ""}
    ]
    
    completion = queryBedrockStreaming(messages)
    entities = getTextWithinTags(completion, "entities")
    
    return cleanJSONString(entities)

def qb_assessImpact(article, path, interested_entity, news_entity):
    messages = [
        {"role":"user", "content": """
You will be given a news article, and its connection to an entity.  
You are to assess the potential impact of the news article on an interested entity based on its connection.
You are risk adverse and sensitive to negative news.

Here is the news article:
<article>
{article}
</article>

Here is the entity mentioned in the news article:
<news_entity>
{news_entity}
</news_entity>

Here is the entity I am interested in:
<interested_entity>
{entity}
</interested_entity>

Here is how the news entity is connected to the entity I am interested in:
<path>
{path}
</path>

Based on the impact of the news to <news_entity> and the <path> provided, perform the following:
1) Print out a concise and short summary of the potential impact to <interested_entity> between <result></result> tag.  Highlight phrases that mentions the impact to <interested_entity> and the reasons why using <b></b> tags.
2) Print out either POSITIVE/NEGATIVE/NEUTRAL impact to <interested_entity> between <impact></impact> tag.
""".format(article=article, path=path, entity=interested_entity, news_entity=news_entity)},
         {"role":"assistant", "content": ""}
    ]

    completion = queryBedrockStreaming(messages)
    impact = getTextWithinTags(completion, "impact")
    result = getTextWithinTags(completion, "result")

    return result, impact


def processArticle(article):
    g, connection = GraphConnect()
    value_of_n = getN() 
    entities = qb_extractDataFromArticle(article)
    entities = uppercase(json.loads(entities))
    paths = []
    interested_entities = set()
    
    for entity in entities:
        pathsArray = findVertexWithinNHops(
            g,
            entity["LABEL"],
            entity["NAME"],
            { "INDUSTRY": entity["INDUSTRY"] if "INDUSTRY" in entity else "" }, 
            entity["RELATIONSHIPS"] if "RELATIONSHIPS" in entity else [], 
            value_of_n
        )
        if len(pathsArray) > 0:
            for path in pathsArray:
                result, impact = qb_assessImpact(article, path["path"], path["interested_entity"], entity["NAME"])
                path["impact"] = impact
                path["assessment"] = result

            paths.append({
                "name": entity["NAME"],
                "sentiment": entity["SENTIMENT"],
                "sentiment_explanation": entity["SENTIMENT_EXPLANATION"],
                "paths": pathsArray,
            })
            
            for path in pathsArray:
                interested_entities.add(path["interested_entity"])
    
    current_timestamp = time.time()
    dt_object = datetime.fromtimestamp(current_timestamp)
    formatted_time = dt_object.strftime("%Y-%m-%d %H:%M")
    
    table.put_item(
        Item={
            'id': str(uuid.uuid4()),
            'date': getTextWithinTags(article, "date"),
            'title': getTextWithinTags(article, "title"),
            'text': getTextWithinTags(article, "text"),
            'url': getTextWithinTags(article, "url"),
            'timestamp': formatted_time,
            'interested': "YES" if len(paths) > 0 else "NO",
            'paths': paths,
            'interested_entities': list(interested_entities)
        }
    )
    connection.close()
    
def isValidJson(text):
    try:
        json.loads(text)
        return True
    except:
        return False

def lambda_handler(event, context):
    try:
        body = event["Records"][0]["body"]
        if isValidJson(body):
            # process news file
            body = json.loads(body)
            s3_bucket = body["Records"][0]["s3"]["bucket"]["name"]
            s3_key = body["Records"][0]["s3"]["object"]["key"]
            
            s3_key_decoded = urllib.parse.unquote_plus(s3_key)
            response = s3.get_object(Bucket=s3_bucket, Key=s3_key_decoded)
            file_content = response['Body'].read().decode('utf-8')
        
            processArticle(file_content)
            s3.delete_object(Bucket=s3_bucket, Key=s3_key_decoded)
        else:
            # re-process existing news article in DynamoDB

            response = table.get_item(Key={"id": body})
            
            if 'Item' in response:
                file_content = """
                <date>{date}</date>
                <title>{title}</title>
                <text>{text}</text>
                <url>{url}</url>
                """.format(date=response['Item']['date'] if 'date' in response['Item'] else "", 
                           title=response['Item']['title'] if 'title' in response['Item'] else "",  
                           text=response['Item']['text'] if 'text' in response['Item'] else "",
                           url=response['Item']['url'] if "url" in response['Item'] else "")
                processArticle(file_content)
                table.delete_item(Key={"id": body})
            else:
                print("Item not found:", body)
        
        return {
            'statusCode': 200,
            'body': json.dumps('Success!')
        }
    except Exception as e: # clear unintended queue messages such as s3:TestEvent
        print(e, event)
        return {
            'statusCode': 200,
            'body': event
        }
