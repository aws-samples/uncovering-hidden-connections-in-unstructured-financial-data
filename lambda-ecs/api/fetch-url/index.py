import boto3
import json
import os
import uuid
import datetime
from newspaper import Article

def lambda_handler(event, context):
    try:
        body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        url = body.get('url', '').strip()

        if not url:
            return response(400, {'error': 'Missing url'})

        article = Article(url)
        article.download()
        article.parse()

        title = article.title or url
        text = article.text
        date = article.publish_date
        formatted_date = date.strftime("%d %b %Y") if date else datetime.datetime.now().strftime("%d %b %Y")

        if not text or len(text.strip()) < 50:
            return response(400, {'error': 'Could not extract meaningful content from URL'})

        content = f"<date>{formatted_date}</date><title>{title}</title><text>{text}</text><url>{url}</url>"

        s3 = boto3.client("s3")
        s3.put_object(
            Body=content,
            Bucket=os.environ["S3_BUCKET"],
            Key=f"news_{uuid.uuid4()}.txt"
        )

        return response(200, {'message': 'Article fetched and queued for processing', 'title': title})

    except Exception as e:
        print(f"Error: {e}")
        return response(500, {'error': str(e)})

def response(status, body):
    return {
        'statusCode': status,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
        },
        'body': json.dumps(body)
    }
