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

def qb_generateDocumentSummary(chunks,summaryChunkCount):
    text = ' '.join([chunks[i]["text"] for i in range(int(summaryChunkCount))])
    try:
        sampleJSON = """
    {
        "MAIN_ENTITY": {
            "NAME": "<FULL_NAME>",
            "ATTRIBUTES" : [
                { "INDUSTRY": "<ATTRIBUTE_VALUE>" },
                { "FOCUS_AREA": ["<ATTRIBUTE_VALUE>"] },
                { "REVENUE_GENERATING_INDUSTRIES": ["<ATTRIBUTE_VALUE>"] },
                { "SUMMARY_OF_BUSINESS_PERFORMANCE": "<ATTRIBUTE_VALUE>" },
                { "SUMMARY_OF_BUSINESS_STRATEGY": "<ATTRIBUTE_VALUE>" },
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

    2) Identify the industry that the main entity is operating in.  Leave string value empty if you cannot identify any.
            
    3) Identity the focus area that the main entity is focusing on.  Leave array empty if you cannot identify any.

    4) Identify the revenue generating industries that the main entity is operating in.  Leave array empty if you cannot identify any.

    5) Summarize the business performance of the main entity.  Leave string value empty if you cannot identify any.

    6) Summarize the business strategy of the main entity.  Leave string value empty if you cannot identify any.

    7) Print out the results in <results></results> tag using the following JSON format:
    {sampleJSON}
    """.format(text=text, sampleJSON=sampleJSON)},
            {"role":"assistant", "content": ""}
        ]

        completion = queryBedrockStreaming(messages)
        
        results = getTextWithinTags(completion,'results').strip()
        if results == "":
            return qb_generateDocumentSummary(chunks,summaryChunkCount)
        else:
            results = uppercase( json.loads(cleanJSONString(results)) )
            savePrompt(convertMessagesToTextCompletion(messages) + "\n\n" + completion, id=results["MAIN_ENTITY"]["NAME"]+"->qb_generateDocumentSummary")

            return json.dumps( results ) 
    except Exception as e:
        if "validationException".upper() in str(e).upper() and "Input is too long".upper() in str(e).upper():
            return qb_generateDocumentSummary(chunks, summaryChunkCount * 0.75)
        else:
            raise Exception(e)

        
    
def splitDocument(fileName):
    maxTokensPerChunk = 500 # estimate 1 space = 1 word = 1 token
    
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
    maxSummaryChunkCount = 40 # max number of chunks to use for summary; 1 chunk ~ 1 page
    summary = json.loads(qb_generateDocumentSummary(chunks,min(maxSummaryChunkCount,len(chunks)-1)))
    summary["MAIN_ENTITY"]["ATTRIBUTES"] = summary["MAIN_ENTITY"]["ATTRIBUTES"] + [{ "SOURCE":  S3_KEY.split("/")[-1].upper() }]
    
    #make a shorter copy of summary json object for use in process chunks only
    summaryShort = json.loads(json.dumps(summary))
    # delete SUMMARY_OF_BUSINESS_PERFORMANCE and SUMMARY_OF_BUSINESS_STRATEGY from summaryShort 
    def deleteAttribute(array, key):
        i = 0
        for attribute in array["MAIN_ENTITY"]["ATTRIBUTES"]:
            if key in attribute:
                del array["MAIN_ENTITY"]["ATTRIBUTES"][i]
            i = i + 1
    deleteAttribute(summaryShort, "SUMMARY_OF_BUSINESS_PERFORMANCE")
    deleteAttribute(summaryShort, "SUMMARY_OF_BUSINESS_STRATEGY")
    
    for chunk in chunks:
        uuids.append({
            "id": chunk["id"],
            "summary": summaryShort,
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
