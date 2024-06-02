import json
import os
import boto3
import uuid
import time

from connectionsinsights.bedrock import (
    cleanJSONString,
    queryBedrockStreaming,
    getTextWithinTags,
    savePrompt,
    convertMessagesToTextCompletion
)
  
dynamodb_resource = boto3.resource('dynamodb')
dynamodb = boto3.client("dynamodb")

def qb_filterCustomers(customers, main_entity_name):
    if customers.strip() == "{}":
        return "[]"
    
    prompt_history = ""
    completion = ""
    jsonFormat = """{
	"<COMPANY_NAME>": { "<ATTRIBUTE_NAME>": "<ATTRIBUTE_VALUE>" },
	...
}"""

    messages = [
        {"role":"user", "content": """
I will provide you with a JSON object of companies who are customers of {main_entity_name}.
The JSON object is in this format:
{jsonFormat}

Here is the JSON object of companies:
<customers>
{customers}
</customers>

Perform the following steps:
1. Categorise each item in <customers> into companies/conglomerates/organisations vs others.
2. Keep only companies/conglomerates/organisations and remove every other categories.
3. Some of the attributes may be missing due to lack of information in the source document but this does not necessarily mean that an item is not a company/conglomerate/organisation.
4. If there are some indication that an item is a company/conglomerate/organisation even though there are limited information, you may include it as an company/conglomerate/organisation.
5. Assess each item individually and print your explanation within <explanation> tags.
6. After printing the explanation, print an array containing only names of companies/conglomerates/organisations between <customers></customers> tags.  E.g. [ "COMPANY" ]
""".format(main_entity_name=main_entity_name,customers=customers,jsonFormat=jsonFormat)},
         {"role":"assistant", "content": """"""}
    ]

    completion = queryBedrockStreaming(messages)
    prompt_history = convertMessagesToTextCompletion(messages) + "\n\n" + completion + "\n"

    savePrompt(prompt_history, id=main_entity_name+"->qb_filterCustomers")

    # get results from the final completion
    response = getTextWithinTags(completion,"customers").strip()
    response = cleanJSONString(response)
    try:
        json.loads(response)
        return response
    except:
        return qb_filterCustomers(customers, main_entity_name)


def qb_filterSuppliers(suppliers_or_partners, main_entity_name):
    if suppliers_or_partners.strip() == "{}":
        return "[]"
    
    prompt_history = ""
    completion = ""
    jsonFormat = """{
	"<COMPANY_NAME>": { "<ATTRIBUTE_NAME>": "<ATTRIBUTE_VALUE>" },
	...
}"""

    messages = [
        {"role":"user", "content": """
I will provide you with a JSON object of companies who are suppliers or partners of {main_entity_name}.
The JSON object is in this format:
{jsonFormat}

Here is the JSON object of companies:
<suppliers_or_partners>
{suppliers_or_partners}
</suppliers_or_partners>

Perform the following steps:
1. Categorise each item in <suppliers_or_partners> into companies/conglomerates/organisations vs others.
2. Keep only companies/conglomerates/organisations and remove every other categories.
3. Some of the attributes may be missing due to lack of information in the source document but this does not necessarily mean that an item is not a company/conglomerate/organisation.
4. If there are some indication that an item is a company/conglomerate/organisation even though there are limited information, you may include it as an company/conglomerate/organisation.
5. Assess each item individually and print your explanation within <explanation> tags.
6. After printing the explanation, print an array containing only names of companies/conglomerates/organisations between <suppliers_or_partners></suppliers_or_partners> tags.  E.g. [ "COMPANY" ]
""".format(main_entity_name=main_entity_name,suppliers_or_partners=suppliers_or_partners,jsonFormat=jsonFormat)},
         {"role":"assistant", "content": """"""}
    ]
        
    completion = queryBedrockStreaming(messages)
    prompt_history = convertMessagesToTextCompletion(messages) + "\n\n" + completion + "\n"

    savePrompt(prompt_history, id=main_entity_name+"->qb_filterSuppliers")

    # get results from the final completion
    response = getTextWithinTags(completion,"suppliers_or_partners").strip()
    response = cleanJSONString(response)
    try:
        json.loads(response)
        return response
    except:
        return qb_filterSuppliers(suppliers_or_partners, main_entity_name)

def qb_filterCompetitors(competitors, main_entity_name):
    if competitors.strip() == "{}":
        return "[]"
    
    prompt_history = ""
    completion = ""
    jsonFormat = """{
	"<COMPANY_NAME>": { "<ATTRIBUTE_NAME>": "<ATTRIBUTE_VALUE>" },
	...
}"""

    messages = [
        {"role":"user", "content": """
I will provide you with a JSON object of companies who are competitors of {main_entity_name}.
The JSON object is in this format:
{jsonFormat}

Here is the JSON object of companies:
<competitors>
{competitors}
</competitors>

Perform the following steps:
1. Categorise each item in <competitors> into companies/conglomerates/organisations vs others.
2. Keep only companies/conglomerates/organisations and remove every other categories.
3. Some of the attributes may be missing due to lack of information in the source document but this does not necessarily mean that an item is not a company/conglomerate/organisation.
4. If there are some indication that an item is a company/conglomerate/organisation even though there are limited information, you may include it as an company/conglomerate/organisation.
5. Assess each item individually and print your explanation within <explanation> tags.
6. After printing the explanation, print an array containing only names of companies/conglomerates/organisations between <competitors></competitors> tags.  E.g. [ "COMPANY" ]
""".format(main_entity_name=main_entity_name,competitors=competitors,jsonFormat=jsonFormat)},
         {"role":"assistant", "content": """"""}
    ]

    completion = queryBedrockStreaming(messages)
    prompt_history = convertMessagesToTextCompletion(messages) + "\n\n" + completion + "\n"

    savePrompt(prompt_history, id=main_entity_name+"->qb_filterCompetitors")

    # get results from the final completion
    response = getTextWithinTags(completion,"competitors").strip()
    response = cleanJSONString(response)
    try:
        json.loads(response)
        return response
    except:
        return qb_filterCompetitors(competitors, main_entity_name)

def qb_filterDirectors(directors, main_entity_name):
    if directors.strip() == "{}":
        return "[]"
    
    prompt_history = ""
    completion = ""
    jsonFormat = """{
	{ "<PERSON_NAME>" : { "<ATTRIBUTE_NAME>": "<ATTRIBUTE_VALUE>" },
    ...
}"""

    messages = [
        {"role":"user", "content": """
I will provide you with a JSON object of people who works for {main_entity_name}.
The JSON object is in this format:
{jsonFormat}

Here is the JSON object of people:
<people>
{directors}
</people>

1. For each item in <people>, identify whether it has a first name and a last name and print them.
2. Print names that have at least a first name and a last name.  Remove all other items.
3. If a person's name have multiple variations, make sure you keep the different versions for step 4.
4. Next, print an array containing only names of actual people between <people></people> tags.  E.g. <people>[ "PERSON_NAME1", "PERSON_NAME2", ... ]</people>
5. You are to work with only the information provided in the context.
6. Do not print codes.
""".format(main_entity_name=main_entity_name,directors=json.dumps(json.loads(directors)),jsonFormat=jsonFormat)},
        {"role":"assistant", "content": """"""}
    ]

    completion = queryBedrockStreaming(messages)    
    prompt_history = convertMessagesToTextCompletion(messages) + "\n\n" + completion + "\n\n"

    savePrompt(prompt_history, id=main_entity_name+"->qb_filterDirectors")

    # get results from the final completion
    response = getTextWithinTags(completion,"people").strip()
    response = cleanJSONString(response)
    try:
        json.loads(response)
        return response
    except Exception as e:
        print("qb_filterDirectors:", e)
        return qb_filterDirectors(directors, main_entity_name)

def split_json(json_obj, max_size):
    smaller_objs = []
    current_obj = {}
    
    for key, value in json_obj.items():
        if len(current_obj) == max_size:
            smaller_objs.append(current_obj)
            current_obj = {}
        current_obj[key] = value
    
    if current_obj:
        smaller_objs.append(current_obj)
    
    return smaller_objs

def lambda_handler(event, context):
    
    summary = event["summary"]
    bodyType = event["bodyType"]
    jsonID = event["jsonID"]

    main_entity_name = summary["MAIN_ENTITY"]["NAME"]
    dynamodb_table_name = os.environ["DDBTBL_INGESTION"]    
    table = dynamodb_resource.Table(dynamodb_table_name)

    if "raw_customers" == bodyType:
        response = dynamodb.get_item(TableName=dynamodb_table_name, Key={"id": {"S": jsonID}})
        raw_customers = json.loads(response["Item"]["data"]["S"])
        filteredCustomersArray = []
        arr_json_objects = split_json(raw_customers,100)
        for obj in arr_json_objects:
            filteredCustomersArray = filteredCustomersArray + json.loads( qb_filterCustomers( json.dumps(obj), main_entity_name))
        finalCustomers = {}
        for key in filteredCustomersArray:
            try:
                finalCustomers[key] = raw_customers[key]
            except Exception as e:
                print(e, key) #intentionally skip so if LLM hallucinates and introduces a key not previously available, it will skip.
        id = str(uuid.uuid4())
        table.put_item(
            Item={
            "id": id,
            "type": "finalCustomers",
            "data": json.dumps(finalCustomers),
            'ttl_timestamp': int(time.time()) + 7200
        })
        return { "finalCustomers" : id }
        
    elif "raw_suppliers_or_partners" == bodyType:
        response = dynamodb.get_item(TableName=dynamodb_table_name, Key={"id": {"S": jsonID}})
        raw_suppliers_or_partners = json.loads(response["Item"]["data"]["S"])
        filteredSuppliersArray = []
        arr_json_objects = split_json(raw_suppliers_or_partners,100)
        for obj in arr_json_objects:
            filteredSuppliersArray = filteredSuppliersArray + json.loads( qb_filterSuppliers( json.dumps(obj), main_entity_name))
        finalSuppliers = {}
        for key in filteredSuppliersArray:
            try:
                finalSuppliers[key] = raw_suppliers_or_partners[key]
            except Exception as e:
                print(e, key) #intentionally skip so if LLM hallucinates and introduces a key not previously available, it will skip.
        id = str(uuid.uuid4())
        table.put_item(
            Item={
            "id": id,
            "type": "finalSuppliers",
            "data": json.dumps(finalSuppliers),
            'ttl_timestamp': int(time.time()) + 7200
        })
        return { "finalSuppliers" : id }
        
    elif "raw_competitors" == bodyType:
        response = dynamodb.get_item(TableName=dynamodb_table_name, Key={"id": {"S": jsonID}})
        raw_competitors = json.loads(response["Item"]["data"]["S"])
        arr_json_objects = split_json(raw_competitors,100)
        filteredCompetitorsArray = []
        for obj in arr_json_objects:
            filteredCompetitorsArray = filteredCompetitorsArray + json.loads( qb_filterCompetitors( json.dumps(obj), main_entity_name))
        finalCompetitors = {}
        for key in filteredCompetitorsArray:
            try:
                finalCompetitors[key] = raw_competitors[key]
            except Exception as e:
                print(e, key) #intentionally skip so if LLM hallucinates and introduces a key not previously available, it will skip.
        id = str(uuid.uuid4())
        table.put_item(
            Item={
            "id": id,
            "type": "finalCompetitors",
            "data": json.dumps(finalCompetitors),
            'ttl_timestamp': int(time.time()) + 7200
        })
        return { "finalCompetitors" : id }
    
        
    elif "raw_directors" == bodyType:
        response = dynamodb.get_item(TableName=dynamodb_table_name, Key={"id": {"S": jsonID}})
        raw_directors = json.loads(response["Item"]["data"]["S"])
        arr_json_objects = split_json(raw_directors,100)
        filteredDirectorsArray = []
        for obj in arr_json_objects:
            filteredDirectorsArray = filteredDirectorsArray + json.loads( qb_filterDirectors( json.dumps(obj), main_entity_name))
        finalDirectors = {}
        for key in filteredDirectorsArray:
            try:
                finalDirectors[key] = raw_directors[key]
            except Exception as e:
                print(e, key) #intentionally skip so if LLM hallucinates and introduces a key not previously available, it will skip.
        id = str(uuid.uuid4())
        table.put_item(
            Item={
            "id": id,
            "type": "finalDirectors",
            "data": json.dumps(finalDirectors),
            'ttl_timestamp': int(time.time()) + 7200
        })
        return { "finalDirectors" : id }
