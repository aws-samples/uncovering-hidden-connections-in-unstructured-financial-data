
import boto3
import uuid
import os
from datetime import datetime

def clean_name(name):
    suffixes = ["CO", "INC", "LTD", "LLP", "LIMITED", "COM"]  # Add more if needed
    prefixes = ["MR", "DR", "PROF", "MS", "MISS", "MDM", "MRS"]  # Add more if needed
    punctuations = [",",".","-","\""] # Add more if needed
    for punctuation in punctuations:
        name = name.replace(punctuation, ' ').strip()
    
    name_array = name.split()
    name_array = [part for part in name_array if part.upper() not in suffixes]
    name_array = [part for part in name_array if part.upper() not in prefixes]

    return " ".join(name_array).strip()   

# Processing Status Management Functions
def get_processing_status_table():
    """Get the processing status DynamoDB table"""
    dynamodb = boto3.resource('dynamodb')
    table_name = os.environ.get("DDBTBL_PROCESSING_STATUS")
    if not table_name:
        raise ValueError("DDBTBL_PROCESSING_STATUS environment variable not set")
    return dynamodb.Table(table_name)

def create_processing_status(file_name, file_type, total_steps=2):
    """Create a new processing status record"""
    processing_id = str(uuid.uuid4())
    current_time = datetime.utcnow().isoformat() + 'Z'  # UTC ISO format
    
    table = get_processing_status_table()
    table.put_item(
        Item={
            'id': processing_id,
            'file_type': file_type,
            'file_name': file_name,
            'completed_step_count': 0,
            'total_step_count': total_steps,
            'datetime_started': current_time,
            'datetime_ended': ''
        }
    )
    return processing_id

def increment_processing_status(processing_id, is_final_step=False):
    """Increment the processing status by 1"""
    current_time = datetime.utcnow().isoformat() + 'Z'  # UTC ISO format
    
    table = get_processing_status_table()
    update_expression = "ADD completed_step_count :inc"
    expression_values = {':inc': 1}
    
    # If this is the final step, also set end time
    if is_final_step:
        update_expression += " SET datetime_ended = :end_time"
        expression_values[':end_time'] = current_time
    
    table.update_item(
        Key={'id': processing_id},
        UpdateExpression=update_expression,
        ExpressionAttributeValues=expression_values
    )

def mark_processing_failed(processing_id, error_message):
    """Mark processing as failed with error message"""
    current_time = datetime.utcnow().isoformat() + 'Z'  # UTC ISO format
    
    table = get_processing_status_table()
    table.update_item(
        Key={'id': processing_id},
        UpdateExpression="SET datetime_ended = :end_time, error_message = :error",
        ExpressionAttributeValues={
            ':end_time': current_time,
            ':error': str(error_message)[:500]  # Limit error message length
        }
    )