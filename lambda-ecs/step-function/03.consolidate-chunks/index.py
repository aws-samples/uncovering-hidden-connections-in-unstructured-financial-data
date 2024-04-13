import json
import os

from connectionsinsights.bedrock import (
    uppercase
)

def convertToArray(data):
    if isinstance(data, str):
        return [ x.upper().strip() for x in data.split(",")]
    elif isinstance(data, list):
        return data
    else:
        raise Exception("consolidate-chunks: convertToArray: unknown data type:", data)
    
def lambda_handler(event, context):
    chunks = event["output"]
    summary = event["Summary"]
    main_entity = summary['MAIN_ENTITY']
    
    products = set()
    raw_customers = {}
    raw_suppliers_or_partners = {}
    raw_competitors = {}
    raw_directors = {}
    
    for chunk in chunks:
        try:                
            results = uppercase(json.loads(chunk))
            if "COMMERCIAL_PRODUCTS_OR_SERVICES" in results:
                products = products | set([x['NAME'] for x in results['COMMERCIAL_PRODUCTS_OR_SERVICES']])        
            
            if "CUSTOMERS" in results:
                for x in [row for row in results['CUSTOMERS'] if len(row['NAME']) > 0]:
                    if x['NAME'] not in raw_customers:
                        raw_customers[x['NAME']] = { key : convertToArray(x[key]) for key in x.keys() if key not in ["NAME"] }
                    else:
                        for key in raw_customers[x['NAME']].keys():
                            raw_customers[x['NAME']][key] = list(set( raw_customers[x['NAME']][key] ) | set( convertToArray(x[key]) ) )
            if "SUPPLIERS_OR_PARTNERS" in results:
                for x in [row for row in results['SUPPLIERS_OR_PARTNERS'] if len(row['NAME']) > 0]:
                    if x['NAME'] not in raw_suppliers_or_partners:
                        raw_suppliers_or_partners[x['NAME']] = { key : convertToArray(x[key]) for key in x.keys() if key not in ["NAME"] }
                    else:
                        for key in raw_suppliers_or_partners[x['NAME']].keys():
                            raw_suppliers_or_partners[x['NAME']][key] = list(set( raw_suppliers_or_partners[x['NAME']][key] ) | set( convertToArray(x[key]) ) )

            if "COMPETITORS" in results:
                for x in [row for row in results['COMPETITORS'] if len(row['NAME']) > 0]:
                    if x['NAME'] not in raw_competitors:
                        raw_competitors[x['NAME']] = { key : convertToArray(x[key]) for key in x.keys() if key not in ["NAME"] }
                    else:
                        for key in raw_competitors[x['NAME']].keys():
                            raw_competitors[x['NAME']][key] = list(set( raw_competitors[x['NAME']][key] ) | set( convertToArray(x[key]) ) )

            if "DIRECTORS" in results:
                for x in [row for row in results['DIRECTORS'] if len(row['NAME']) > 0]:
                    if x['NAME'] not in raw_directors:
                        raw_directors[x['NAME']] = { key : convertToArray(x[key]) for key in x.keys() if key not in ["NAME"] }
                    else:
                        for key in raw_directors[x['NAME']].keys():
                            if key in ["OTHER_ASSOCIATIONS"]:
                                raw_directors[x['NAME']][key] = raw_directors[x['NAME']][key] +  x[key] # concat instead of union as its a dict
                            else:
                                raw_directors[x['NAME']][key] = list(set( raw_directors[x['NAME']][key] ) | set( convertToArray(x[key]) ) )   
    
        except Exception as e:
            print("for chunk in chunks:", e) 
            print( chunk )
            
    return [
        {"raw_customers": raw_customers, "summary" : summary},
        {"raw_suppliers_or_partners": raw_suppliers_or_partners, "summary" : summary},
        {"raw_competitors": raw_competitors, "summary" : summary},
        {"raw_directors": raw_directors, "summary" : summary}
    ]
    



