import tempfile
import json
import pypdf
import os
import boto3
import uuid
import time
import urllib.parse

from connectionsinsights.bedrock import (
    cleanJSONString,
    queryBedrockStreaming,
    getTextWithinTags,
    uppercase,
    savePrompt,
    convertMessagesToTextCompletion
)

def qb_generateDocumentSummary(text):
    sampleJSON = """
{
	"MAIN_ENTITY": {
		"NAME": "<FULL_NAME>",
		"ATTRIBUTES" : [
			{ "INDUSTRY": "<ATTRIBUTE_VALUE>" },
			{ "FOCUS_AREA": ["<ATTRIBUTE_VALUE>"] },
			{ "REVENUE_GENERATING_INDUSTRIES": ["<ATTRIBUTE_VALUE>"] }
		]
	}
}
"""

    messages = [
        {"role": "user", "content": """
I will provide you with a document that which is a subset of a larger document.  Read it carefully as I will be asking you questions about it.

Here is the document:
<document>
{text}
</document>

1) Identify the full name of the main entity discussed in <document> and any key qualitative attributes mentioned.  Leave array empty if you cannot identify any.

2) Print out the results in <results></results> tag using the following JSON format:
{sampleJSON}
         """.format(text=text, sampleJSON=sampleJSON)},
         {"role":"assistant", "content": ""}
    ]

    completion = queryBedrockStreaming(messages)
    
    results = getTextWithinTags(completion,'results').strip()
    if results == "":
        return qb_generateDocumentSummary(text)
    else:
        results = uppercase( json.loads(cleanJSONString(results)) )
        savePrompt(convertMessagesToTextCompletion(messages) + "\n\n" + completion, id=results["MAIN_ENTITY"]["NAME"]+"->qb_generateDocumentSummary")

        return json.dumps( results ) 
    
def splitDocument(fileName):
    maxTokensPerChunk = 1000 # estimate 1 space = 1 word = 1 token
    
    # read in PDF file using pypdf
    pdfFileObj = open(fileName, 'rb')
    pdfReader = pypdf.PdfReader(pdfFileObj)
    
    # get number of pages
    numPages = int(str(len(pdfReader.pages)))
    
    text = ""
    tokenCount = 0
    currentPage = 1
    startPage = 1
    chunks = []
    
    # loop through each page and get text
    while currentPage <= numPages:
        pageText = pdfReader.pages[currentPage-1].extract_text()
        pageText = pageText.replace("\xa0", " ") # replace special characters with spaces
        pageText = pageText.replace("\n", " ") # replace new line characters with spaces
        pageText = pageText.replace("  ", " ") # remove any extra spaces    
        pageToken = pageText.count(" ")
        if tokenCount + pageToken <= maxTokensPerChunk:
            text += pageText + "\n"
            tokenCount += pageToken
        else:
            chunks.append(
                {
                    'id': str(uuid.uuid4()),
                    'startPage': startPage,
                    'endPage': currentPage-1,
                    'text': text
                }
            )        
            startPage = currentPage
            text = pageText + "\n"
            tokenCount = pageToken
    
        if currentPage == numPages:
            chunks.append(
                {
                    'id': str(uuid.uuid4()),
                    'startPage': startPage,
                    'endPage': currentPage,
                    'text': text
                }
            )
            break
        currentPage += 1
        
    
    # close PDF file
    pdfFileObj.close()
    
    return chunks

def lambda_handler(event, context):
    s3 = boto3.client('s3')
    dynamodb_table_name = os.environ["DDBTBL_INGESTION"]
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(dynamodb_table_name)
    uuids = []
    
    S3_BUCKET = event["StateInfo"]["S3File"]["S3_BUCKET"].strip()
    S3_KEY = event["StateInfo"]["S3File"]["S3_KEY"].strip()
    S3_KEY = urllib.parse.unquote_plus(S3_KEY)

    # Download the file from S3
    local_file_path = os.path.join(tempfile.gettempdir(), S3_KEY.split("/")[-1])
    s3.download_file(S3_BUCKET, S3_KEY, local_file_path)

    chunks = splitDocument(local_file_path)
    maxSummaryChunkCount = 10
    summaryChunkCount = len(chunks) if len(chunks) < maxSummaryChunkCount else maxSummaryChunkCount
    summary = json.loads( qb_generateDocumentSummary(
        ' '.join([chunks[i]["text"] for i in range(summaryChunkCount)])
        ) )
    summary["MAIN_ENTITY"]["ATTRIBUTES"] = summary["MAIN_ENTITY"]["ATTRIBUTES"] + [{ "SOURCE":  S3_KEY.split("/")[-1].upper() }]
    
    for chunk in chunks:
        uuids.append({
            "id": chunk["id"],
            "summary": summary,
            "source": "{file}".format(file=S3_KEY.split("/")[-1])
        })
        table.put_item(Item={
            'id': str(chunk['id']),
            'startPage': int(chunk['startPage']),
            'endPage': int(chunk['endPage']),
            'text': str(chunk['text']),
            'ttl_timestamp': int(time.time()) + 7200
        })
    
    os.remove(local_file_path)
    
    return {
        "uuid": uuids,
        "summary": summary
    }
