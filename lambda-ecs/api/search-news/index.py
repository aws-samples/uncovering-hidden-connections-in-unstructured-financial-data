import boto3
import json
import os
import uuid
import datetime
from newspaper import Article
from duckduckgo_search import DDGS

def lambda_handler(event, context):
    try:
        body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        query = body.get('query', '').strip()
        max_results = min(int(body.get('maxResults', 5)), 10)

        if not query:
            return response(400, {'error': 'Missing query'})

        results = DDGS().news(query, max_results=max_results)

        s3 = boto3.client("s3")
        s3_bucket = os.environ["S3_BUCKET"]
        saved = []

        for result in results:
            try:
                url = result.get('url', '')
                title = result.get('title', '')
                date_str = result.get('date', '')

                # Try to parse the date
                try:
                    date = datetime.datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    formatted_date = date.strftime("%d %b %Y")
                except Exception:
                    formatted_date = datetime.datetime.now().strftime("%d %b %Y")

                # Scrape full article text
                article = Article(url)
                article.download()
                article.parse()
                text = article.text

                if not text or len(text.strip()) < 50:
                    # Fall back to snippet from search result
                    text = result.get('body', '')
                    if not text or len(text.strip()) < 50:
                        continue

                content = f"<date>{formatted_date}</date><title>{title}</title><text>{text}</text><url>{url}</url>"
                s3.put_object(Body=content, Bucket=s3_bucket, Key=f"news_{uuid.uuid4()}.txt")
                saved.append({'title': title, 'url': url})

            except Exception as e:
                print(f"Skipping article: {e}")
                continue

        return response(200, {'message': f'{len(saved)} articles queued for processing', 'articles': saved})

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
