import json
import boto3
import uuid
import os
from datetime import datetime

def lambda_handler(event, context):
    """
    Lambda function to generate presigned URLs for PDF uploads to S3 ingestion bucket
    """
    
    try:
        # Get environment variables
        s3_bucket = os.environ['S3_INGESTION_BUCKET']
        
        # Initialize S3 client
        s3_client = boto3.client('s3')
        
        # Parse the request
        body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        
        # Extract file metadata
        file_name = body.get('fileName')
        file_size = body.get('fileSize', 0)
        content_type = body.get('contentType', 'application/pdf')
        
        if not file_name:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
                },
                'body': json.dumps({
                    'error': 'Missing fileName'
                })
            }
        
        # Validate file type (PDF only)
        if not file_name.lower().endswith('.pdf'):
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
                },
                'body': json.dumps({
                    'error': 'Only PDF files are allowed'
                })
            }
        
        # No file size limit - S3 supports up to 5 TB
        
        # Add UUID suffix to filename to prevent conflicts
        file_base, file_ext = os.path.splitext(file_name)
        short_uuid = str(uuid.uuid4())[:8]
        s3_key = f"{file_base}_{short_uuid}{file_ext}"
        
        # Generate timestamp for metadata
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Generate presigned URL for PUT operation
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': s3_bucket,
                'Key': s3_key,
                'ContentType': content_type,
                'Metadata': {
                    'original-filename': file_name,
                    'upload-timestamp': timestamp,
                    'file-size': str(file_size)
                }
            },
            ExpiresIn=3600  # URL expires in 1 hour
        )
        
        # Return presigned URL and metadata
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
            },
            'body': json.dumps({
                'presignedUrl': presigned_url,
                'bucket': s3_bucket,
                'key': s3_key,
                'expiresIn': 3600,
                'uploadMethod': 'PUT',
                'contentType': content_type
            })
        }
        
    except Exception as e:
        print(f"Error generating presigned URL: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
            },
            'body': json.dumps({
                'error': f'Internal server error: {str(e)}'
            })
        }