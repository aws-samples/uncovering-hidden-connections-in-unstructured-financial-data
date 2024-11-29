import os
import boto3
import json
import random
import time
import re 
import uuid
from math import sqrt, pow
import botocore
from datetime import datetime


# ██████  ███████ ██████  ██████   ██████   ██████ ██   ██ 
# ██   ██ ██      ██   ██ ██   ██ ██    ██ ██      ██  ██  
# ██████  █████   ██   ██ ██████  ██    ██ ██      █████   
# ██   ██ ██      ██   ██ ██   ██ ██    ██ ██      ██  ██  
# ██████  ███████ ██████  ██   ██  ██████   ██████ ██   ██ 

CLAUDE_3_SONNET = "anthropic.claude-3-sonnet-20240229-v1:0"
CLAUDE_3_5_HAIKU = "us.anthropic.claude-3-5-haiku-20241022-v1:0"
CLAUDE_2_1 = "anthropic.claude-v2:1"

default_model_id = CLAUDE_3_SONNET

def convertMessagesToTextCompletion(messages):
    def convertRole(role):
        if role == "user":
            return "Human"
        elif role == "assistant":
            return "Assistant"

    return "".join(
        [convertRole(message["role"]) +": "+ message["content"] +"\n\n" for message in messages]
    )

def queryBedrockTextCompletion(prompt, temperature=0, top_p=0):
    bedrock = boto3.client(
        service_name='bedrock-runtime', 
        endpoint_url = "https://bedrock-runtime."+os.environ["AWS_REGION"]+".amazonaws.com",
        config = botocore.config.Config(
            read_timeout=900,
            connect_timeout=900
        )
    )
    try:
        # queries bedrock (streaming mode)
        output = []

        body = json.dumps({
            "prompt": prompt,
            "max_tokens_to_sample": 4000,
            "temperature": temperature,
            "top_p": top_p,
            "top_k": 250
        })

        modelId = 'anthropic.claude-v2:1'
        accept = '*/*'
        contentType = 'application/json'

        response = bedrock.invoke_model_with_response_stream(body=body, modelId=modelId, accept=accept, contentType=contentType)
        stream = response.get('body')
        if stream:
            for event in stream:
                chunk = event.get('chunk')
                if chunk:
                    chunk_obj = json.loads(chunk.get('bytes').decode())
                    text = chunk_obj['completion']
                    output.append(text)

        return ''.join(output)

    except Exception as e:
        if "throttlingException".upper() in str(e).upper():
            time.sleep(random.randint(10,30))
            return queryBedrockTextCompletion(prompt, temperature, top_p)
        else:
            raise Exception(e)

def queryBedrockMessages(messages, temperature=0, top_p=0, modelId=default_model_id, retry=3):
    bedrock = boto3.client(
        service_name='bedrock-runtime', 
        endpoint_url = "https://bedrock-runtime."+os.environ["AWS_REGION"]+".amazonaws.com",
        config = botocore.config.Config(
            read_timeout=900,
            connect_timeout=900
        )
    )
    try:
        # queries bedrock (streaming mode)
        output = []

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "messages": messages,
            "max_tokens": 4000,
            "temperature": temperature,
            "top_p": top_p,
            "top_k": 250
        })

        accept = '*/*'
        contentType = 'application/json'

        response = bedrock.invoke_model_with_response_stream(body=body, modelId=modelId, accept=accept, contentType=contentType)
        
        stream = response.get('body')
        if stream:
            for event in stream:
                chunk = event.get('chunk')
                if chunk:
                    chunk_obj = json.loads(chunk.get('bytes').decode())
                    if chunk_obj["type"] == 'content_block_delta':
                        text = chunk_obj['delta']['text']
                        output.append(text)

        return ''.join(output)

    except Exception as e:
        if "throttlingException".upper() in str(e).upper():
            time.sleep(random.randint(10,30))
            return queryBedrockMessages(messages, temperature, top_p, modelId, retry)
        elif retry > 0:
            return queryBedrockMessages(messages, temperature, top_p, modelId, retry-1)
        else:
            raise Exception(e)
        
def queryBedrockStreaming(messages, temperature=0, top_p=0, modelId=default_model_id):
    if modelId == "anthropic.claude-v2:1":
        prompt = convertMessagesToTextCompletion(messages)
        return queryBedrockTextCompletion(prompt, temperature, top_p)
    else:
        return queryBedrockMessages(messages, temperature, top_p, modelId)


def disambiguate(entity, combined_matches):
    potential_entity_matches = ""
    for index, match in enumerate(combined_matches):
        potential_entity_matches += f"<potential-entity-match>\n"
        potential_entity_matches += json.dumps(match) + "\n"
        potential_entity_matches += f"</potential-entity-match>\n\n"

    messages = [
        {"role":"user", "content":"""
You are an expert in disambiguating entities and determining if they are the same entity when given limited information.

You are to review through the list of potential entities, and reason through the given information to determine if any of them are the same as the entity provided within <entity> tags.

You are to follow these rules strictly:
1. You will only use the information provided in the context in your disambiguation.
2. Subsidiaries or joint ventures should not be considered as the same entity as the parent company; they are to be considered as distinctly different entities.
3. Parent companies should not be considered the same as the child company.
4. As the entities are extracted from different sources, you should take into consideration that one entity may have much richer information than the other.  The differences in the level of detailed information between each potential entity and the provided entity should not indicate that the entities are different.
5. As the amount of information provided may be different for each potential entity and the provided entity, the potential entity does not need to fully match the provided entity to be considered the same.  It is sufficient if there are enough similarities without much conflicting differences.
6. Companies with the same name and operating in the same industry or focus area have a strong likelihood to be the same entity.

Here is the entity:

<entity>
{entity}
</entity>

Here are the list of potential entities that may be the same as the above entity: 

{potential_entity_matches}

If you determined that a potential entity is likely to be the same as the entity provided, then reply with the ID of the potential entity within <results></results> tag.  You should only return a maximum of 1 ID.

If you determined that none of the potential entities are the same as the entity provided, reply with "NO MATCH FOUND" within <results></results> tag.

Provide your explanation within <explanation> tags.

Think step by step.
""".format(entity=json.dumps(entity), potential_entity_matches=potential_entity_matches)},
            {"role":"assistant", "content":""""""}
    ]
    
    completion = queryBedrockStreaming(messages, temperature=0, top_p=0)
    results = getTextWithinTags(completion, "results").strip()
    
    prompt_history = convertMessagesToTextCompletion(messages) + "\n\n" + completion
    savePrompt(prompt_history, id="disambiguate->"+entity["NAME"])
    
    if results == "NO MATCH FOUND":
        return None
    else:
        return results

def getTextWithinTags(text,tags):
    # extract text out from within <tags></tags>
    counter = 0
    start = len(text)
    end = 0
    response = ""
    while response == "" and counter < 5:
        end = text.rfind("</"+tags+">",0, start)
        start = text.rfind("<"+tags+">",0, start)
        if start > -1 and end > -1:
            response = text[start+len("<"+tags+">") : end].strip()
        counter += 1
        if len(response) > 0:
            break

    return response

def cleanJSONString(text):
    # Replace 'NULL' with empty string
    cleaned_text = re.sub(r'\bNULL\b', '""', text, flags=re.IGNORECASE)
    return cleaned_text

def generateEmbeddings(prompt):
    prompt = " ".join(prompt.split()[0:min(2500,len( prompt.split() ))])
    bedrock = boto3.client(service_name='bedrock-runtime', endpoint_url = "https://bedrock-runtime."+os.environ["AWS_REGION"]+".amazonaws.com")
    body = json.dumps({"inputText": prompt})

    modelId = 'amazon.titan-embed-text-v1'
    accept = '*/*'
    contentType = 'application/json'

    response = bedrock.invoke_model(body=body, modelId=modelId, accept=accept, contentType=contentType)
    response_body = json.loads(response['body'].read())
    embedding = response_body['embedding']
    return embedding

def cosine_similarity(vector1, vector2):
    dot_product = 0
    magnitude_vector1 = 0
    magnitude_vector2 = 0

    for i in range(len(vector1)):
        dot_product += vector1[i] * vector2[i]
        magnitude_vector1 += pow(vector1[i], 2)
        magnitude_vector2 += pow(vector2[i], 2)

    magnitude = sqrt(magnitude_vector1) * sqrt(magnitude_vector2)
    return dot_product / magnitude

def uppercase(data):
    if isinstance(data, dict):
        return {key: uppercase(value) for key, value in data.items()}
    elif isinstance(data, str):
        return data.upper()
    elif isinstance(data, list):
        return [ uppercase(x) for x in data ]
    else:
        return data

def savePrompt(prompt, id=""):
    current_timestamp = time.time()
    dt_object = datetime.fromtimestamp(current_timestamp)
    formatted_time = dt_object.strftime("%Y-%m-%d %H:%M")

    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(os.environ["DDBTBL_PROMPTS"])
        table.put_item(
            Item={
                'id': id+str(uuid.uuid4()),
                'prompt': prompt,
                'timestamp': formatted_time,
                'ttl_timestamp': int(current_timestamp) + 86400                
            }
        )
    except Exception as e:
        print(e)

