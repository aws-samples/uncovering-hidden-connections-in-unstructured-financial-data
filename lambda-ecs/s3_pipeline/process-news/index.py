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
import botocore.exceptions

from connectionsinsights.dynamodb import (
    getN,
)

from connectionsinsights.neptune import (
    findVertexWithinNHops,
    GraphConnect  
)

from connectionsinsights.utils import (
    create_processing_status,
    increment_processing_status,
    mark_processing_failed
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
    
    # Retry logic for Bedrock calls
    max_retries = 3
    for attempt in range(max_retries):
        try:
            completion = queryBedrockStreaming(messages)
            entities = getTextWithinTags(completion, "entities")
            return cleanJSONString(entities)
        except botocore.exceptions.ClientError as e:
            error_code = e.response['Error']['Code']
            print(f"Bedrock error on attempt {attempt + 1}: {error_code} - {str(e)}")
            
            if error_code in ['ServiceUnavailableException', 'ThrottlingException']:
                if attempt < max_retries - 1:
                    # Exponential backoff: 2, 4, 8 seconds
                    wait_time = 2 ** (attempt + 1)
                    print(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    print("Max retries reached for Bedrock call")
                    # Return empty result to prevent complete failure
                    return "[]"
            else:
                # For other errors, don't retry
                print(f"Non-retryable Bedrock error: {error_code}")
                return "[]"
        except Exception as e:
            print(f"Unexpected error in Bedrock call: {str(e)}")
            if attempt < max_retries - 1:
                wait_time = 2 ** (attempt + 1)
                print(f"Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
                continue
            else:
                return "[]"

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

    # Retry logic for Bedrock calls
    max_retries = 3
    for attempt in range(max_retries):
        try:
            completion = queryBedrockStreaming(messages)
            impact = getTextWithinTags(completion, "impact")
            result = getTextWithinTags(completion, "result")
            return result, impact
        except botocore.exceptions.ClientError as e:
            error_code = e.response['Error']['Code']
            print(f"Bedrock error in impact assessment on attempt {attempt + 1}: {error_code} - {str(e)}")
            
            if error_code in ['ServiceUnavailableException', 'ThrottlingException']:
                if attempt < max_retries - 1:
                    # Exponential backoff: 2, 4, 8 seconds
                    wait_time = 2 ** (attempt + 1)
                    print(f"Retrying impact assessment in {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    print("Max retries reached for impact assessment")
                    # Return neutral impact to prevent complete failure
                    return "Unable to assess impact due to service issues", "NEUTRAL"
            else:
                # For other errors, don't retry
                print(f"Non-retryable Bedrock error in impact assessment: {error_code}")
                return "Unable to assess impact due to service error", "NEUTRAL"
        except Exception as e:
            print(f"Unexpected error in impact assessment: {str(e)}")
            if attempt < max_retries - 1:
                wait_time = 2 ** (attempt + 1)
                print(f"Retrying impact assessment in {wait_time} seconds...")
                time.sleep(wait_time)
                continue
            else:
                return "Unable to assess impact due to unexpected error", "NEUTRAL"


def processArticle(article, processing_id=None):
    # Increment processing status (step 0 -> 1)
    if processing_id:
        increment_processing_status(processing_id)
    
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
    processing_id = None
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
            
            # Extract filename from S3 key
            file_name = s3_key_decoded.split('/')[-1]
            
            # Create processing status record
            processing_id = create_processing_status(file_name, 'news')
        
            try:
                processArticle(file_content, processing_id)
                
                # Increment processing status to completed (step 1 -> 2)
                increment_processing_status(processing_id, is_final_step=True)
                
                s3.delete_object(Bucket=s3_bucket, Key=s3_key_decoded)
            except Exception as process_error:
                print(f"Error processing article: {str(process_error)}")
                # Mark as failed in processing status
                if processing_id:
                    try:
                        mark_processing_failed(processing_id, str(process_error))
                    except Exception as status_error:
                        print(f"Failed to update error status: {str(status_error)}")
                raise process_error
                
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
                
                # Create processing status for reprocessing
                processing_id = create_processing_status(f"Reprocess: {response['Item'].get('title', 'Unknown')}", 'news')
                
                try:
                    processArticle(file_content, processing_id)
                    
                    # Increment processing status to completed (step 1 -> 2)
                    increment_processing_status(processing_id, is_final_step=True)
                    
                    table.delete_item(Key={"id": body})
                except Exception as process_error:
                    print(f"Error reprocessing article: {str(process_error)}")
                    # Mark as failed in processing status
                    if processing_id:
                        try:
                            mark_processing_failed(processing_id, str(process_error))
                        except Exception as status_error:
                            print(f"Failed to update error status: {str(status_error)}")
                    raise process_error
            else:
                print("Item not found:", body)
        
        return {
            'statusCode': 200,
            'body': json.dumps('Success!')
        }
    except Exception as e:
        print(f"Lambda handler error: {str(e)}")
        print(f"Event: {event}")
        
        # Mark processing as failed if we have a processing_id
        if processing_id:
            try:
                mark_processing_failed(processing_id, f"Lambda handler error: {str(e)}")
            except Exception as status_error:
                print(f"Failed to update error status in final handler: {str(status_error)}")
        
        return {
            'statusCode': 200,
            'body': json.dumps(f'Error: {str(e)}')
        }
