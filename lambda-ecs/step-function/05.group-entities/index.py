import boto3
import json
import uuid
import time
import os

from connectionsinsights.neptune import (
    getOrCreateID,
    GraphConnect
)

dynamodb = boto3.resource('dynamodb')
dynamodb_table_name = os.environ["DDBTBL_INGESTION"]
table = dynamodb.Table(dynamodb_table_name)

def lambda_handler(event, context):
    summary = event["Summary"]
    main_entity_name = summary["MAIN_ENTITY"]["NAME"]
    attributes = summary["MAIN_ENTITY"]["ATTRIBUTES"]

    allEdges = []
    results = {}
    for obj in event["output"]:
        item = table.get_item(Key={'id': obj[list(obj.keys())[0]]})    
        data = json.loads(item["Item"]["data"])
        for key in data:
            if key == "":
                continue
            
            # group records into A-Z,#
            if key[0].isalpha():
                try:
                    results[key[0].upper()].append({key:data[key]})
                except:
                    results[key[0].upper()] = [ {key:data[key]} ]
            else:
                try:
                    results["#"].append( {key:data[key]} )
                except:
                    results["#"] = [ {key:data[key]} ]
                    
            # consolidate all edges together
            if data[key]["TYPE"] == "CUSTOMER":
                edges = [key+" is a customer of (PRODUCTS_USED:"+",".join(data[key]["PRODUCTS_USED"])+") "+main_entity_name]
                allEdges = edges + allEdges
            elif data[key]["TYPE"] == "SUPPLIER":
                edges = [key+" is a supplier of (RELATIONSHIP:"+",".join(data[key]["RELATIONSHIP"])+") "+main_entity_name]
                allEdges = edges + allEdges
            elif data[key]["TYPE"] == "COMPETITOR":
                edges = [key+" is a competitor of (COMPETING_IN:"+",".join(data[key]["COMPETING_IN"])+") "+main_entity_name]
                allEdges = edges + allEdges
            elif data[key]["TYPE"] == "DIRECTOR":
                edges = [key+" is a director of (ROLE: "+",".join(data[key]["ROLE"])+") "+main_entity_name]
                allEdges = edges + allEdges
    
    g, connection = GraphConnect()
    ## Create main entity
    for attribute in attributes:
        key, value = list(attribute.keys())[0], list(attribute.values())[0]
        if isinstance(value, list):
            attribute[key] = ",".join(value)
    main_entity_id = getOrCreateID(g,"COMPANY", main_entity_name, attributes, allEdges)
    connection.close()
    
    uuids = []
    for key in results:
        id = str(uuid.uuid4())
        table.put_item(
            Item={
            "id": id,
            "main_entity": summary["MAIN_ENTITY"]["NAME"],
            "key": key,
            "data": json.dumps(results[key]),
            "summary": json.dumps(summary),
            "main_entity_all_edges": json.dumps(allEdges),
            "main_entity_id": main_entity_id,
            'ttl_timestamp': int(time.time()) + 7200
        })
        uuids.append(id)

    return uuids