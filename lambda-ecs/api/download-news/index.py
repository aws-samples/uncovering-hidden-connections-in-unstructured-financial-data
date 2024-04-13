import boto3
import requests
import json
import datetime 
import os
import uuid
from newspaper import Article

def downloadNews(newsapikey):
    headers = {'X-Api-Key': newsapikey} 
    url = f"https://newsapi.org/v2/top-headlines?category=business&language=en&country=us"
    response = requests.get(url,headers=headers, timeout=300)
    newsJSON = json.loads(response.text)

    for article in newsJSON["articles"]:
        try:
            title = article["title"]

            date_string = article["publishedAt"]
            date = datetime.datetime.strptime(date_string, "%Y-%m-%dT%H:%M:%SZ")
            formatted_date = date.strftime("%d %b %Y")

            news_article = Article(article["url"])
            news_article.download()
            news_article.parse()
            text = news_article.text

            content = f"<date>{formatted_date}</date><title>{title}</title><text>{text}</text>"

            saveToS3(content)
        except Exception as e:
            print(e)
            continue

def saveToS3(article):
    s3_bucket = os.environ["S3_BUCKET"]
    s3 = boto3.client("s3")
    s3.put_object(Body=article, Bucket=s3_bucket, Key="news_"+str(uuid.uuid4())+".txt")

def lambda_handler(event, context):
    newsapikey = event["newsapikey"]
    downloadNews(newsapikey)
    
    return {
        'statusCode': 200,
        'body': 'News articles downloaded successfully.'
    }

