import json
import boto3
import os
import uuid
import time

from connectionsinsights.bedrock import (
    cleanJSONString,
    queryBedrockStreaming,
    getTextWithinTags,
    savePrompt,
    convertMessagesToTextCompletion
)

dynamodb = boto3.resource('dynamodb')
dynamodb_table_name = os.environ["DDBTBL_INGESTION"]
table = dynamodb.Table(dynamodb_table_name)

def qb_extractChunkData(text, summary, main_entity_name, id):
    responses = []
    prompt_history = ""
    completion = ""
    sampleJSON = """
{
	"COMMERCIAL_PRODUCTS_OR_SERVICES": [
		{ "NAME": "<FULL_PRODUCT_NAME>" }
	],
	"CUSTOMERS": [
		{ "NAME": "<FULL_COMPANY_NAME>", "PRODUCTS_USED": "<MAPPED TO ONE OF THE ITEM FROM COMMERCIAL_PRODUCTS_OR_SERVICES>", "FOCUS_AREA": "<COMPANY_BUSINESS_FOCUS_AREA>", "INDUSTRY": "<INDUSTRY>" }
	],
	"SUPPLIERS_OR_PARTNERS": [
		{ "NAME": "<FULL_COMPANY_NAME>", "RELATIONSHIP": "<RELATIONSHIP_DETAILS_WITH_MAIN_ENTITY>", "FOCUS_AREA": "<COMPANY_BUSINESS_FOCUS_AREA>", "INDUSTRY": "<INDUSTRY>" }
	],
    "COMPETITORS": [
		{ "NAME": "<FULL_COMPANY_NAME>", "COMPETING_IN": "<PRODUCTS_OR_AREAS_IN_COMPETITION>", "FOCUS_AREA": "<COMPANY_BUSINESS_FOCUS_AREA>", "INDUSTRY": "<INDUSTRY>" }
	],
	"DIRECTORS" : [
		{ "NAME": "<FULL_PERSON_NAME_EXCLUDE_TITLES>", "ROLE": "<ROLE_IN_MAIN_ENTITY>", "OTHER_ASSOCIATIONS": [ {"ROLE": "<ROLE_IN_OTHER_ASSOCIATIONS>", "COMPANY_NAME" : "<COMPANY_NAMES>", "FOCUS_AREA": "<COMPANY_BUSINESS_FOCUS_AREA>", "INDUSTRY": "<INDUSTRY>" } ] }
	]
}
"""

    messages = [
        {"role":"user", "content":"""
I will provide you with a document that which is a subset of a larger document which discusses about the main entity provided in <main_entity></main_entity> tags.
<main_entity>
{main_entity}
</main_entity>

Read this document carefully as I will be asking you questions about it.

Here is the document:
<document>
{text}
</document>

Using the text enclosed within <document></document> tag, perform the following steps:
1) Identify named commercial products or services provided by {main_entity_name}. Leave array empty if you cannot identify any. For any values that you cannot determine, return empty string.

2) Identify customers of {main_entity_name}. Leave array empty if you cannot identify any. For any values that you cannot determine, return empty string.

3) Identify suppliers or partners of {main_entity_name}. Leave array empty if you cannot identify any. For any values that you cannot determine, return empty string.

4) Identify competitors of {main_entity_name}. Leave array empty if you cannot identify any. For any values that you cannot determine, return empty string.

5) Identify directors of {main_entity_name} and their current / prior roles with other companies within <document></document>. Leave array empty if you cannot identify any. For any values that you cannot determine, return empty string.

6) Be as complete as you can in your idenfication of all information, and include any mentioned information even if they were mentioned to be in the past.

7) If attributes such as industry or focus area are not available, derive it using the context from the surrounding text.

8) Print out your thought process explaining the relationship of each entity within <thoughts></thoughts> xml tag.

9) It is important that you print out the output within <results></results> xml tag using the following JSON format and ensure that the output is a valid JSON format.
{sampleJSON}
         """.format(main_entity=summary,main_entity_name=main_entity_name, text=text,sampleJSON=sampleJSON)},
         {"role":"assistant", "content": """"""}
    ]

    
    completion = queryBedrockStreaming(messages)
    prompt_history = convertMessagesToTextCompletion(messages) + "\n\n" + completion + "\n"

    savePrompt(prompt_history, id=id)

    results = cleanJSONString(getTextWithinTags(completion,"results"))
    try:
        json.loads(results)
        return results
    except:
        return qb_extractChunkData(text, summary, id)

def lambda_handler(event, context):
    id = event["id"]
    item = table.get_item(Key={'id': id})
    summary = item["Item"]["summary"]
    source = item["Item"]["source"]
    startPage = str(item["Item"]["startPage"])
    endPage = str(item["Item"]["endPage"])
    text = item["Item"]["text"]
    
    results = qb_extractChunkData(text, json.dumps(summary), summary["MAIN_ENTITY"]["NAME"], summary["MAIN_ENTITY"]["NAME"]+"->qb_extractChunkData->"+"(pg"+startPage+"-"+endPage+")->" )

    results = json.loads(results)

    id = str(uuid.uuid4())
    
    table.put_item(Item={
        'id': id,
        'COMMERCIAL_PRODUCTS_OR_SERVICES': [ {**x, "SOURCE": source} for x in results["COMMERCIAL_PRODUCTS_OR_SERVICES"] ],
        'CUSTOMERS': [ {**x, "SOURCE": source} for x in results["CUSTOMERS"] ],
        'SUPPLIERS_OR_PARTNERS': [ {**x, "SOURCE": source} for x in results["SUPPLIERS_OR_PARTNERS"] ],
        'COMPETITORS': [ {**x, "SOURCE": source} for x in results["COMPETITORS"] ],
        'DIRECTORS': [ {**x, "SOURCE": source} for x in results["DIRECTORS"] ],
        'ttl_timestamp': int(time.time()) + 7200
    })
    
    return id
