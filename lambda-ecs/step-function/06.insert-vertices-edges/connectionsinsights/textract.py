import boto3
import time
import uuid
import json
import os
import tempfile

textract_client = boto3.client('textract')
s3_client = boto3.client('s3')

def start_document_analysis(s3_bucket, s3_key):
    id = str(uuid.uuid4())
    
    # Start the document analysis
    response = textract_client.start_document_analysis(
        DocumentLocation={
            'S3Object': {
                'Bucket': s3_bucket,
                'Name': s3_key
            }
        },
        OutputConfig={
            'S3Bucket': s3_bucket,
            'S3Prefix': f'textract_output/{id}'
        },
        FeatureTypes=['LAYOUT']
    )

    # Get the JobId from the response
    job_id = response['JobId']
    print(f'Started job with ID: {job_id}')

    # Wait for the job to complete
    while True:
        response = textract_client.get_document_analysis(JobId=job_id)
        status = response['JobStatus']
        
        if status in ['SUCCEEDED', 'FAILED']:
            print(f'Textract Job status: {status}, {id}')
            return status, id
        
        print('Waiting for job to complete...')
        time.sleep(5)


def get_pages(id, s3_bucket):
    s3_prefix = f"textract_output/{id}"
    paginator = s3_client.get_paginator('list_objects_v2')
    files = []
    for page in paginator.paginate(Bucket=s3_bucket, Prefix=s3_prefix):
        for obj in page.get('Contents', []):
            files.append(obj['Key'])

    files = sorted( files, key=lambda x: ((int(x.split("/")[-1]) if x.split("/")[-1].isdigit() else 9999),x) )
    
    blocks = []

    # Download each file from S3 and save it as the file name without prefix
    for file in files:
        if not file.endswith('.s3_access_check'):
            local_filename = os.path.join(tempfile.gettempdir(), file.split("/")[-1])            
            s3_client.download_file(s3_bucket, file, local_filename)
            with open(local_filename, 'r') as myfile:
                data=myfile.read()
                obj = json.loads(data)
                blocks = blocks + obj["Blocks"]
            os.remove(local_filename) # Remove files from local file system

    lines = {}
    for block in blocks:
        if block["BlockType"] == "LINE":
            lines[block["Id"]] = block["Text"]

    pages = {}
    for block in blocks:
        if block["BlockType"] in ["LAYOUT_TITLE", "LAYOUT_TEXT", "LAYOUT_SECTION_HEADER", "LAYOUT_FOOTER", "LAYOUT_TABLE", "LAYOUT_FIGURE"]:
            line = ""
            if "Relationships" in block and block["Relationships"] is not None:
                for relationship in block["Relationships"]:
                    if relationship["Type"] == "CHILD":
                        for child in relationship["Ids"]:
                            if child in lines:
                                line += lines[child] + " "
                        if block["Page"] not in pages:
                            pages[block["Page"]] = line
                        else:
                            pages[block["Page"]] += '\n' + line

    # Delete all files under s3_prefix
    for file in files:
        s3_client.delete_object(Bucket=s3_bucket, Key=file)
    
    return pages


def extract_text(s3_bucket, s3_key):
    start_time = time.time()
    status, id = start_document_analysis(s3_bucket, s3_key)
    end_time = time.time()
    duration = end_time - start_time
    print(f"Duration: {duration} seconds")
    if status == "SUCCEEDED":    
        pages = get_pages(id, s3_bucket)
        end_time = time.time()
        duration = end_time - start_time
        print(f"Duration: {duration} seconds")
        return list(pages.values())
    else:
        return None