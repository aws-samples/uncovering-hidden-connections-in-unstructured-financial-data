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
6. Print an array containing only names of companies/conglomerates/organisations between <customers></customers> tags.  E.g. [ "COMPANY" ]
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
6. Print an array containing only names of companies/conglomerates/organisations between <suppliers_or_partners></suppliers_or_partners> tags.  E.g. [ "COMPANY" ]
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
6. Print an array containing only names of companies/conglomerates/organisations between <competitors></competitors> tags.  E.g. [ "COMPANY" ]
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

    messages_initial = [
        {"role":"user", "content": """
I will provide you with a JSON object of people who works for {main_entity_name}.
The JSON object is in this format:
{jsonFormat}

Here is the JSON object of people:
<people>
{directors}
</people>

Some of the people listed could be named differently but are actually referring to the same person.
Review through the people in <people> and perform the following steps:
1. Identify those duplicates by inferring from the similarity of their names, acronyms, and also from the roles they perform.
2. List the duplicates identified in tuples and the explanation.
3. Among each group of duplicates, pick the most complete name to keep and remove the others from <people>.
4. Print the updated list of people between <people> tags
5. You are to work with only the information provided in the context.
        """.format(main_entity_name=main_entity_name,directors=directors,jsonFormat=jsonFormat)},
        {"role":"assistant", "content": """"""}
    ]

    messages_followon = [
        {"role":"user", "content": """
1. Categorise each item in <people> into actual people vs others.
2. Keep only actual people (at least with first name and last name) and remove every other categories.
3. Print an array containing only names of actual people between <people></people> tags.  E.g. [ "PERSON_NAME" ]
4. You are to work with only the information provided in the context.
        """},
        {"role":"assistant", "content": """"""}
    ]

    completion = queryBedrockStreaming(messages_initial)    
    messages_followon = [messages_initial[0]] + [{"role":"assistant", "content": completion}] + messages_followon
    completion = queryBedrockStreaming(messages_followon)
    prompt_history = convertMessagesToTextCompletion(messages_followon) + "\n\n" + completion + "\n\n"

    savePrompt(prompt_history, id=main_entity_name+"->qb_filterDirectors")

    # get results from the final completion
    response = getTextWithinTags(completion,"people").strip()
    response = cleanJSONString(response)
    try:
        json.loads(response)
        return response
    except:
        return qb_filterDirectors(directors, main_entity_name)

def lambda_handler(event, context):
    summary = event["summary"]
    main_entity_name = summary["MAIN_ENTITY"]["NAME"]
    
    dynamodb_table_name = os.environ["DDBTBL_INGESTION"]
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(dynamodb_table_name)
    
    if "raw_customers" in event:
        raw_customers = event["raw_customers"]
        filteredCustomersArray = json.loads( qb_filterCustomers( json.dumps(raw_customers), main_entity_name) )
        finalCustomers = {}
        for key in filteredCustomersArray:
            try:
                finalCustomers[key] = raw_customers[key]
            except Exception as e:
                print(e, key) #intentionally skip so if LLM hallucinates and introduces a key not previously available, it will skip.
        id = str(uuid.uuid4())
        table.put_item(Item={
            "id": id,
            "type": "finalCustomers",
            "data": json.dumps(finalCustomers),
            'ttl_timestamp': int(time.time()) + 7200
        })
        return { "finalCustomers" : id } 
        
    elif "raw_suppliers_or_partners" in event:
        raw_suppliers_or_partners = event["raw_suppliers_or_partners"]
        filteredSuppliersArray = json.loads( qb_filterSuppliers( json.dumps(raw_suppliers_or_partners), main_entity_name))
        finalSuppliers = {}
        for key in filteredSuppliersArray:
            try:
                finalSuppliers[key] = raw_suppliers_or_partners[key]
            except Exception as e:
                print(e, key) #intentionally skip so if LLM hallucinates and introduces a key not previously available, it will skip.
        id = str(uuid.uuid4())
        table.put_item(Item={
            "id": id,
            "type": "finalSuppliers",
            "data": json.dumps(finalSuppliers),
            'ttl_timestamp': int(time.time()) + 7200
        })
        return { "finalSuppliers" : id } 
        
    elif "raw_competitors" in event:
        raw_competitors = event["raw_competitors"]
        filteredCompetitorsArray  = json.loads( qb_filterCompetitors( json.dumps(raw_competitors), main_entity_name) )
        finalCompetitors = {}
        for key in filteredCompetitorsArray:
            try:
                finalCompetitors[key] = raw_competitors[key]
            except Exception as e:
                print(e, key) #intentionally skip so if LLM hallucinates and introduces a key not previously available, it will skip.
        id = str(uuid.uuid4())
        table.put_item(Item={
            "id": id,
            "type": "finalCompetitors",
            "data": json.dumps(finalCompetitors),
            'ttl_timestamp': int(time.time()) + 7200
        })
        return { "finalCompetitors" : id } 
        
    elif "raw_directors" in event:
        raw_directors = event["raw_directors"]
        filteredDirectorsArray = json.loads( qb_filterDirectors( json.dumps(raw_directors), main_entity_name) )
        finalDirectors = {}
        for key in filteredDirectorsArray:
            try:
                finalDirectors[key] = raw_directors[key]
            except Exception as e:
                print(e, key) #intentionally skip so if LLM hallucinates and introduces a key not previously available, it will skip.
        id = str(uuid.uuid4())
        table.put_item(Item={
            "id": id,
            "type": "finalDirectors",
            "data": json.dumps(finalDirectors),
            'ttl_timestamp': int(time.time()) + 7200
        })
        return { "finalDirectors" : id }
    