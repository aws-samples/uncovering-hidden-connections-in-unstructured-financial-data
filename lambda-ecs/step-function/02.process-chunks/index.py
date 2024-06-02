import json

from connectionsinsights.bedrock import (
    cleanJSONString,
    queryBedrockStreaming,
    getTextWithinTags,
    savePrompt,
    convertMessagesToTextCompletion
)

def qb_extractChunkData(text, summary, id):
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
1) Identify named commercial products or services provided by the <main_entity>. Leave array empty if you cannot identify any.  For any values that you cannot determine, return empty string.

2) Identify customers of the <main_entity>. Leave array empty if you cannot identify any.  For any values that you cannot determine, return empty string.

3) Identify suppliers or partners of the <main_entity>. Leave array empty if you cannot identify any.  For any values that you cannot determine, return empty string.

4) Identify competitors of the <main_entity>. Leave array empty if you cannot identify any.  For any values that you cannot determine, return empty string.

5) Identify directors of the <main_entity> and their current / prior roles with other companies within <document></document>.  Leave array empty if you cannot identify any.  For any values that you cannot determine, return empty string.

6) Be as complete as you can in your idenfication of all information, and include any mentioned information even if they were mentioned to be in the past.

7) Print out the results in <results> tag using the following JSON format:
{sampleJSON}
         """.format(main_entity=summary,text=text,sampleJSON=sampleJSON)},
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
    text = event["text"]
    summary = event["summary"]
    source = event["source"]
    item = event["item"]
    startPage = item["startPage"]["N"]
    endPage = item["endPage"]["N"]
    
    results = qb_extractChunkData(text, json.dumps(summary), summary["MAIN_ENTITY"]["NAME"]+"->qb_extractChunkData->"+"(pg"+startPage+"-"+endPage+")->" )

    results = json.loads(results)
    results["COMMERCIAL_PRODUCTS_OR_SERVICES"] = [ {**x, "SOURCE": source} for x in results["COMMERCIAL_PRODUCTS_OR_SERVICES"] ]
    results["CUSTOMERS"] = [ {**x, "SOURCE": source} for x in results["CUSTOMERS"] ]
    results["SUPPLIERS_OR_PARTNERS"] = [ {**x, "SOURCE": source} for x in results["SUPPLIERS_OR_PARTNERS"] ]
    results["COMPETITORS"] = [ {**x, "SOURCE": source} for x in results["COMPETITORS"] ]
    results["DIRECTORS"] = [ {**x, "SOURCE": source} for x in results["DIRECTORS"] ]

    
    return json.dumps(results)
