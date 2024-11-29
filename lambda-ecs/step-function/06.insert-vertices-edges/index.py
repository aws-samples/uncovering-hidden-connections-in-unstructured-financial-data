import json
import os
import boto3
import subprocess

from connectionsinsights.neptune import (
    getOrCreateID,
    addOrUpdateEdge,
    GraphConnect
)

dynamodb = boto3.resource('dynamodb')
dynamodb_table_name = os.environ["DDBTBL_INGESTION"]
table = dynamodb.Table(dynamodb_table_name)
stepfunction = boto3.client('stepfunctions')

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
            attributes = getAttributesArray(finalDirectors[empKey], ["OTHER_ASSOCIATIONS", "ROLE", "TYPE"])
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
            attributes = getAttributesArray(finalCustomers[custKey], ["PRODUCTS_USED", "TYPE"])
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
            attributes = getAttributesArray(finalSuppliers[suppKey], ["RELATIONSHIP", "TYPE"])
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
            attributes = getAttributesArray(finalCompetitors[compKey], ["COMPETING_IN", "TYPE"])
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

    uuid = os.environ["uuid"]
    item = table.get_item(Key={'id': uuid})['Item']
    array = json.loads(item["data"])
    summary = json.loads(item["summary"])
    main_entity_id = item["main_entity_id"]
    
    main_entity_name = summary["MAIN_ENTITY"]["NAME"]

    for obj in array:
        for key in obj: # single key dictionary
            if obj[key]["TYPE"] == "CUSTOMER":
                insertCustomers(g,obj, main_entity_id, main_entity_name)
                customerKeys.append(key)
            elif obj[key]["TYPE"] == "SUPPLIER":
                insertSuppliers(g,obj, main_entity_id, main_entity_name)
                supplierKeys.append(key)
            elif obj[key]["TYPE"] == "COMPETITOR":
                insertCompetitors(g,obj, main_entity_id, main_entity_name)                
                competitorKeys.append(key)
            elif obj[key]["TYPE"] == "DIRECTOR":
                insertDirectors(g,obj, main_entity_id, main_entity_name)
                directorKeys.append(key)
    
    connection.close()

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
