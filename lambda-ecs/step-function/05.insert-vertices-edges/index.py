import json
import os
import boto3
import subprocess

from connectionsinsights.neptune import (
    getOrCreateID,
    addOrUpdateEdge,
    GraphConnect
)

def getAttributesArray(datadict, exclusionarray):
    attributes = []
    for attributeKey in datadict.keys():
        if attributeKey in exclusionarray:
            continue
        if isinstance(datadict[attributeKey], list):
            attributes.append({ attributeKey : ",".join(datadict[attributeKey]) })
        else:
            attributes.append({ attributeKey : datadict[attributeKey] })
    return attributes

def insertDirectors(g,finalDirectors, main_entity_id, main_entity_name):
    # Create Directors
    for empKey in finalDirectors.keys():
        try:
            if empKey == "":
                continue
            label = "PERSON"
            name = empKey
            attributes = getAttributesArray(finalDirectors[empKey], ["OTHER_ASSOCIATIONS", "ROLE"])
            edges = [empKey+" is a director of (ROLE: "+",".join(finalDirectors[empKey]["ROLE"])+") "+main_entity_name]
            id = getOrCreateID(g,label, name, attributes, edges)
            edge_property_dict = { "ROLE": ",".join(finalDirectors[empKey]["ROLE"]), "SOURCE": ",".join(finalDirectors[empKey]["SOURCE"]) }
            addOrUpdateEdge(g,id, "is a director of", main_entity_id, edge_property_dict )
            other_associations = finalDirectors[empKey]["OTHER_ASSOCIATIONS"]            
            for other_association in other_associations:
                try:
                    if other_association["COMPANY_NAME"] == "":
                        continue
                    attributes = getAttributesArray(other_association, ["ROLE", "COMPANY_NAME"])
                    attributes.append({"SOURCE": ",".join(finalDirectors[empKey]["SOURCE"])})
                    edges = [empKey+" is an employee/director of (ROLE: "+other_association["ROLE"]+") "+other_association["COMPANY_NAME"]]
                    association_id = getOrCreateID(g,"COMPANY", other_association["COMPANY_NAME"], attributes, edges)
                    edge_property_dict = { "ROLE": other_association["ROLE"], "SOURCE": ",".join(finalDirectors[empKey]["SOURCE"]) }
                    addOrUpdateEdge(g,id, "is an employee/director of", association_id, edge_property_dict )
                except Exception as e:
                    print(e, empKey, other_association)
                    continue
        except Exception as e:
            print(e, empKey, finalDirectors[empKey])
            continue

def insertCustomers(g,finalCustomers, main_entity_id, main_entity_name):
    # Create Customers
    for custKey in finalCustomers.keys():
        try:
            if custKey == "":
                continue
            label = "COMPANY"
            name = custKey
            attributes = getAttributesArray(finalCustomers[custKey], ["PRODUCTS_USED"])
            edges = [custKey+" is a customer of (PRODUCTS_USED:"+",".join(finalCustomers[custKey]["PRODUCTS_USED"])+") "+main_entity_name]
            id = getOrCreateID(g,label, name, attributes, edges)
            edge_property_dict = { "PRODUCTS_USED": ",".join(finalCustomers[custKey]["PRODUCTS_USED"]), "SOURCE": ",".join(finalCustomers[custKey]["SOURCE"]) }
            addOrUpdateEdge(g,id, "is a customer of", main_entity_id, edge_property_dict )
        except Exception as e:
            print(e, custKey, finalCustomers[custKey])
            continue

def insertSuppliers(g,finalSuppliers, main_entity_id, main_entity_name):
    # Create Suppliers
    for suppKey in finalSuppliers.keys():
        try:
            if suppKey == "":
                continue
            label = "COMPANY"
            name = suppKey
            attributes = getAttributesArray(finalSuppliers[suppKey], ["RELATIONSHIP"])
            edges = [suppKey+" is a supplier of (RELATIONSHIP:"+",".join(finalSuppliers[suppKey]["RELATIONSHIP"])+") "+main_entity_name]
            id = getOrCreateID(g,label, name, attributes, edges)
            edge_property_dict = { "RELATIONSHIP": ",".join(finalSuppliers[suppKey]["RELATIONSHIP"]), "SOURCE": ",".join(finalSuppliers[suppKey]["SOURCE"]) }
            addOrUpdateEdge(g,id, "is a supplier/partner of", main_entity_id, edge_property_dict )
        except Exception as e:
            print(e, suppKey, finalSuppliers[suppKey])
            continue

def insertCompetitors(g,finalCompetitors, main_entity_id, main_entity_name):
    # Create Competitors
    for compKey in finalCompetitors.keys():
        try:
            if compKey == "":
                continue
            label = "COMPANY"
            name = compKey
            attributes = getAttributesArray(finalCompetitors[compKey], ["COMPETING_IN"])
            edges = [compKey+" is a competitor of (COMPETING_IN:"+",".join(finalCompetitors[compKey]["COMPETING_IN"])+") "+main_entity_name]
            id = getOrCreateID(g,label, name, attributes, edges)
            edge_property_dict = { "COMPETING_IN": ",".join(finalCompetitors[compKey]["COMPETING_IN"]), "SOURCE": ",".join(finalCompetitors[compKey]["SOURCE"]) }
            addOrUpdateEdge(g,id, "is a competitor of", main_entity_id, edge_property_dict )
        except Exception as e:
            print(e, compKey, finalCompetitors[compKey])
            continue
        
def main():
    # Set up AWS credentials in environment 
    uri = os.environ["AWS_CONTAINER_CREDENTIALS_RELATIVE_URI"]
    result = subprocess.run(["curl",f"169.254.170.2{uri}"], capture_output=True, text=True)
    envJSON = json.loads(result.stdout)
    os.environ["AWS_ACCESS_KEY_ID"] = envJSON["AccessKeyId"]
    os.environ['AWS_SECRET_ACCESS_KEY'] = envJSON["SecretAccessKey"]
    os.environ['AWS_SESSION_TOKEN'] = envJSON["Token"]

    g, connection = GraphConnect()
    customerKeys = []
    supplierKeys = []
    competitorKeys = []
    directorKeys = []
    allEdges = []

    arrays = json.loads(os.environ["output"])
    summary = json.loads(os.environ["Summary"])
    main_entity_name = summary["MAIN_ENTITY"]["NAME"]
    attributes = summary["MAIN_ENTITY"]["ATTRIBUTES"]

    dynamodb_table_name = os.environ["DDBTBL_INGESTION"]
    dynamodb = boto3.client('dynamodb')

    for array in arrays:
        if "finalCustomers" in array:
            response = dynamodb.get_item(TableName=dynamodb_table_name, Key={"id": {"S": array["finalCustomers"]}})
            finalCustomers = json.loads(response["Item"]["data"]["S"])
            for custKey in finalCustomers.keys():
                try:
                    if custKey == "":
                        continue
                    edges = [custKey+" is a customer of (PRODUCTS_USED:"+",".join(finalCustomers[custKey]["PRODUCTS_USED"])+") "+main_entity_name]
                    allEdges = edges + allEdges
                except Exception as e:
                    print(e, custKey, finalCustomers[custKey])
                    continue
            
        elif "finalSuppliers" in array:
            response = dynamodb.get_item(TableName=dynamodb_table_name, Key={"id": {"S": array["finalSuppliers"]}})
            finalSuppliers = json.loads(response["Item"]["data"]["S"])
            for suppKey in finalSuppliers.keys():
                try:
                    if suppKey == "":
                        continue
                    edges = [suppKey+" is a supplier of (RELATIONSHIP:"+",".join(finalSuppliers[suppKey]["RELATIONSHIP"])+") "+main_entity_name]
                    allEdges = edges + allEdges
                except Exception as e:
                    print(e, suppKey, finalSuppliers[suppKey])
                    continue
            
        elif "finalCompetitors" in array:
            response = dynamodb.get_item(TableName=dynamodb_table_name, Key={"id": {"S": array["finalCompetitors"]}})
            finalCompetitors = json.loads(response["Item"]["data"]["S"])
            for compKey in finalCompetitors.keys():
                try:
                    if compKey == "":
                        continue
                    edges = [compKey+" is a competitor of (COMPETING_IN:"+",".join(finalCompetitors[compKey]["COMPETING_IN"])+") "+main_entity_name]
                    allEdges = edges + allEdges
                except Exception as e:
                    print(e, compKey, finalCompetitors[compKey])
                    continue
            
        elif "finalDirectors" in array:
            response = dynamodb.get_item(TableName=dynamodb_table_name, Key={"id": {"S": array["finalDirectors"]}})
            finalDirectors = json.loads(response["Item"]["data"]["S"])
            for empKey in finalDirectors.keys():
                try:
                    if empKey == "":
                        continue
                    edges = [empKey+" is a director of (ROLE: "+",".join(finalDirectors[empKey]["ROLE"])+") "+main_entity_name]
                    allEdges = edges + allEdges
                except Exception as e:
                    print(e, empKey, finalDirectors[empKey])
                    continue
    
    ## Create main entity
    for attribute in attributes:
        key, value = list(attribute.keys())[0], list(attribute.values())[0]
        if isinstance(value, list):
            attribute[key] = ",".join(value)
    main_entity_id = getOrCreateID(g,"COMPANY", main_entity_name, attributes, allEdges)
    
    insertCustomers(g,finalCustomers, main_entity_id, main_entity_name)
    customerKeys.append(",".join(finalCustomers.keys()))
    insertSuppliers(g,finalSuppliers, main_entity_id, main_entity_name)
    supplierKeys.append(",".join(finalSuppliers.keys()))
    insertCompetitors(g,finalCompetitors, main_entity_id, main_entity_name)
    competitorKeys.append(",".join(finalCompetitors.keys()))
    insertDirectors(g,finalDirectors, main_entity_id, main_entity_name)
    directorKeys.append(",".join(finalDirectors.keys()))

    connection.close()

    stepfunction = boto3.client('stepfunctions')
    stepfunction.send_task_success(
        taskToken=os.environ["TASK_TOKEN"],
        output=json.dumps({
            "message": "Insertion successful",
            "customerKeys": ",".join(customerKeys),
            "supplierKeys": ",".join(supplierKeys),
            "competitorKeys": ",".join(competitorKeys),
            "directorKeys": ",".join(directorKeys)
        })
    )

if __name__ == "__main__":
    main()