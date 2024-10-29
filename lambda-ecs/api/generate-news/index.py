import uuid
import json
import boto3
import random
import time
import datetime
import os 

from connectionsinsights.neptune import (
    getEntities,
    GraphConnect
)

from connectionsinsights.bedrock import (
    getTextWithinTags,
    queryBedrockStreaming,
)

def qb_generateArticle(date, interested, entities):
    entitiesPrompt = """
You are to mention the following entities and generate news according to their given sentiment.
{entities}
""".format(entities=entities)
    
    messages = [
        {"role":"user","content":"""
You are a random financial news generator that generates long form financial news articles.

The date of the news article is: {date}

{entitiesPrompt}

Print the generated financial news article in the following format:
<news>
<date></date>
<title></title>
<text>[THIS IS A FICTIONAL NEWS FOR TESTING PURPOSES ONLY] </text>
<url>N/A</url>
</news>
         """.format(entitiesPrompt=entitiesPrompt if interested == "YES" else "", date=date)},
         {"role":"assistant","content":""}
    ]
    

    completion = queryBedrockStreaming(messages)
    
    # get results from the completion
    return getTextWithinTags(completion, "news")

def saveToS3(article):
    s3_bucket = os.environ["S3_BUCKET"]
    s3 = boto3.client("s3")
    s3.put_object(Body=article, Bucket=s3_bucket, Key="news_"+str(uuid.uuid4())+".txt")

def generateNews(num_of_articles):
    g, connection = GraphConnect()
    entityList = getEntities()
    for i in range(0, num_of_articles):
        entities = []
        date = (datetime.date.today() - datetime.timedelta(days=random.randint(1, 100))).strftime("%d %b %Y")
        interested = "YES" if random.random() < 0.6 else "NO"
        if (interested == "YES"):
            num_of_entities_prob = random.random()
            num_of_entities = 4 if num_of_entities_prob < 0.15 else 3 if num_of_entities_prob < 0.40 else 2 if num_of_entities_prob < 0.60 else 1        
            for j in range(0, num_of_entities):
                randomEntityID = random.randint(0, len(entityList)-1)
                entities.append({
                    "NAME": entityList[randomEntityID]["NAME"],
                    "LABEL": entityList[randomEntityID]["LABEL"],
                    "SENTIMENT": "POSITIVE" if random.random() <= 0.5 else "NEGATIVE"
                })
        article = qb_generateArticle(date, interested, entities)
        saveToS3(article)
    connection.close()
    return None

def lambda_handler(event, context):
    num_of_articles = 10
    if "num_of_articles" in event:
        num_of_articles = event["num_of_articles"]
        
    try:
        generateNews(num_of_articles)
    except Exception as e:
        print(e)
        return {
            'statusCode': 400,
            'body': 'Exception encountered: '+str(e)
        }
        
    return {
        'statusCode': 200,
        'body': 'News articles generated successfully.'
    }