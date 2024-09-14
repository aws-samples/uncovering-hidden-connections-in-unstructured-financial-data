import os
import random
import time

from gremlin_python import statics
from gremlin_python.process.anonymous_traversal import traversal
from gremlin_python.driver.driver_remote_connection import DriverRemoteConnection
from gremlin_python.process.traversal import TextP, T, Direction, Cardinality
from gremlin_python.process.graph_traversal import __
from gremlin_python.driver import serializer

from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.credentials import ReadOnlyCredentials
from types import SimpleNamespace

from connectionsinsights.bedrock import (
    disambiguate
)

from connectionsinsights.utils import (
    clean_name
)


# ███    ██ ███████ ██████  ████████ ██    ██ ███    ██ ███████ 
# ████   ██ ██      ██   ██    ██    ██    ██ ████   ██ ██      
# ██ ██  ██ █████   ██████     ██    ██    ██ ██ ██  ██ █████   
# ██  ██ ██ ██      ██         ██    ██    ██ ██  ██ ██ ██      
# ██   ████ ███████ ██         ██     ██████  ██   ████ ███████ 


def GraphConnect():
    # Create Connection
    global g
    global connection
    statics.load_statics(globals())    
    database_url = 'wss://'+os.environ["NEPTUNE_ENDPOINT"]+'/gremlin'

    service = 'neptune-db'
    method = 'GET'

    access_key = os.environ['AWS_ACCESS_KEY_ID']
    secret_key = os.environ['AWS_SECRET_ACCESS_KEY']
    region = os.environ['AWS_REGION']
    session_token = os.environ['AWS_SESSION_TOKEN']
    
    creds = SimpleNamespace(
        access_key=access_key, secret_key=secret_key, token=session_token, region=region,
    )

    request = AWSRequest(method=method, url=database_url, data=None)
    SigV4Auth(creds, service, region).add_auth(request)

    connection = DriverRemoteConnection(
        database_url,
        'g',
        pool_size=1,
        headers=dict(request.headers.items()),
        ssl=True
    )
    g = traversal().withRemote(connection)

    return g, connection

def getEntities():
    results = g.V().elementMap().toList()
    entities = [{ "ID": row[T.id], "LABEL": row[T.label], "NAME": row["NAME"], "INTERESTED": row["INTERESTED"] if "INTERESTED" in row else "NO" } for row in results]
    
    return entities
    
def updateEntityInterested(ID, INTERESTED):
    results = g.V(ID).property(Cardinality.single, "INTERESTED", INTERESTED).next()

def formatResultsFindVertex(results):
    response = []
    for result in results:
        vertex_id = result[T.id]
        vertex_label = result[T.label]
        vertex_name = result["NAME"]
        vertex_properties = {key: result[key] for key in result.keys() if key not in [T.id, T.label, "NAME"]}
        
        edges_str = []
        edges_out = g.V(vertex_id).outE().as_('edge').inV().as_('destination').select('edge', 'destination').by(__.elementMap()).toList()
        for edge_destination in edges_out:
            edge = edge_destination["edge"]
            destination = edge_destination["destination"]
            edge_properties_array = [ key + ':' + edge[key] for key in edge.keys() if key not in [Direction.OUT, Direction.IN, T.id, T.label, 'NAME']]
            edge_properties = "(" + ",".join(edge_properties_array) + ")" if len(edge_properties_array) > 0 else ""
            edges_str.append(f"{vertex_name} -> {edge[T.label]} {edge_properties} -> {destination['NAME']}")
            
        edges_in = g.V(vertex_id).inE().as_('edge').outV().as_('destination').select('edge', 'destination').by(__.elementMap()).toList()
        for edge_destination in edges_in:
            edge = edge_destination["edge"]
            destination = edge_destination["destination"]
            edge_properties_array = [ key + ':' + edge[key] for key in edge.keys() if key not in [Direction.OUT, Direction.IN, T.id, T.label, 'NAME']]
            edge_properties = "(" + ",".join(edge_properties_array) + ")" if len(edge_properties_array) > 0 else ""
            edges_str.append(f"{destination['NAME']} -> {edge[T.label]} {edge_properties} -> {vertex_name}")
                    
        response.append({
            "ID": vertex_id,
            "LABEL": vertex_label,
            "NAME": vertex_name,
            "PROPERTIES": vertex_properties,
            "EDGES": edges_str
        })
    return response

def findVertexByLabelandName(label, name, exact_match):
    if name is None:
        return []
    
    results = g.V().hasLabel(label).has('NAME', TextP.containing(name) if not exact_match else name).elementMap().toList()
    return formatResultsFindVertex(results)
    
def findVertexByAcronym(label, name):
    # when given acronym (e.g. AMD), searches for names that fits the acronym (e.g. ADVANCED MICRO DEVICES)
    pattern = r''.join([ f'{letter}\\w*\\s+' for letter in name ])
    regex_pattern = r'\b'+ pattern[:-3] + r'\b' # add ^ at the front and $ at the back if we want it to match strictly

    results = g.V().hasLabel(label).has('NAME', TextP.regex(regex_pattern)).elementMap().toList()
    return formatResultsFindVertex(results)

def unionArraysByID(array_of_arrays):
    unique_dict = {}

    for array in array_of_arrays:
        for item in array:
            item_id = item.get('ID')

            if item_id is not None and item_id not in unique_dict:
                unique_dict[item_id] = item

    result = list(unique_dict.values())
    return result

def getID(label, name, properties, edges):
    cleaned_name = clean_name(name)
    acronym = getAcronym(cleaned_name)
    sub_name = getSubName(cleaned_name)

    # Exact Match
    exact_match = findVertexByLabelandName(label, cleaned_name, True)

    # Acronym Match - converts names into acronyms and search them (e.g. ADVANCED MICRO DEVICES -> AMD)
    acronym_match = findVertexByLabelandName(label, acronym, True)

    # Substring Match
    substring_match = findVertexByLabelandName(label, sub_name, False)

    # Acronym Search - searches by acronym (e.g. use AMD to search for ADVANCED MICRO DEVICES)
    acronym_results = findVertexByAcronym(label, name)

    matches = unionArraysByID([exact_match, acronym_match, substring_match, acronym_results])

    if len(matches) == 0:
        return None
    else:
        return disambiguate({"LABEL": label, "NAME": cleaned_name, "PROPERTIES": properties, "EDGES": edges}, matches)
    
def addOrUpdateEdge(source, edge_name, destination, edge_property_dict):
    exists = g.V(source).outE(edge_name).where(__.inV().hasId(destination)).elementMap().toList()
    if not exists:
        edge = g.V(source).addE(edge_name).to(__.V(destination))
        for key in edge_property_dict.keys():
            values = []
            values = [ x.strip() for x in list(set(edge_property_dict[key].split(","))) if x not in [""]]
            edge.property( Cardinality.single, key, ",".join(values) )
        edge.next()
    else:
        existing_edge_dict = exists[0]
        edge = g.E(existing_edge_dict[T.id])
        for key in edge_property_dict.keys():
            values = []
            if key in existing_edge_dict.keys():
                values = [ x.strip() for x in list(set(existing_edge_dict[key].split(",") + edge_property_dict[key].split(","))) if x not in [""]]
            else:
                values = [ x.strip() for x in list(set(edge_property_dict[key].split(","))) if x not in [""]]
            edge.property( key, ",".join(values) )
        edge.next()

def getAcronym(name):
    acronymArray = [word[0] for word in name.split()]
    if len(acronymArray) > 1:
        return ''.join(acronymArray).strip()
    else:
        return None

def getSubName(name):
    for subname in name.split():
        if len(subname.strip()) > 1:
            return subname.strip()
    return None

def createVertex(label, name, attributes):
    cleaned_name = clean_name(name)
    new_vertex = g.addV(label).property(Cardinality.single, 'NAME', cleaned_name)
    for attribute in attributes:
        for key, value in attribute.items():
            new_vertex = new_vertex.property(Cardinality.single, key, value)
    created_vertex = new_vertex.next()
    
    return created_vertex

def updateVertex(id, attributes):
    properties = g.V(id).elementMap().toList()[0]
    properties = { key : properties[key] for key in properties.keys() if key not in [T.id, T.label, 'NAME']}
    
    vertex = g.V(id)
    for attribute in attributes:
        for key, value in attribute.items():
            if key in ["SUMMARY_OF_BUSINESS_PERFORMANCE", "SUMMARY_OF_BUSINESS_STRATEGY"]:
                vertex = vertex.property(Cardinality.single, key, value)
            else:
                value = value + ("," + properties[key] if key in properties else "")
                value = [ i.strip() for i in value.upper().split(",") if i.strip() != ""]
                value = list(set( value ) )
                vertex = vertex.property(Cardinality.single, key, ",".join(value))
    vertex.next()

def getOrCreateID(label, name, attributes, edges):
    try:
        existing_id = getID(label, name, attributes, edges)
        if existing_id:
            updateVertex(existing_id, attributes)
            return existing_id
        else:
            created_vertex = createVertex(label, name, attributes)
            return created_vertex.id
    except Exception as e:
        if "503, message='Invalid response status'".upper() in str(e).upper():
            time.sleep(random.randint(10,30))
            g, conn = GraphConnect()
            return getOrCreateID(label, name, attributes, edges)
        else:            
            raise Exception(e)

def findVertexWithinNHops(label, name, properties, edges, N):
    ret = []
    id = getID(label, name, properties, edges)
    if id:
        paths = g.V(id).has('INTERESTED', 'YES').path().by(__.elementMap()).toList()
        paths = paths + g.V(id).repeat(__.bothE().bothV().simplePath()).times(N).emit().has('INTERESTED', 'YES').path().by(__.elementMap()).toList()
        ret = formatPath(paths)  
    return ret

def formatPath(paths):
    pathStrings = []
    for path in paths:
        pathString = ""
        partCount = 0
        lastVertex = ""
        while partCount < len(path):
            if "NAME" in path[partCount]:
                # Vertex.  Only vertex have "NAME"
                pathString += str(path[partCount]["NAME"]) 
                if (partCount < len(path)-1): #if not the last vertex
                    if path[partCount+1][Direction.IN][T.id] == path[partCount][T.id]:
                        pathString += ' <-- '
                    else:
                        pathString += ' --> '
                else:
                    lastVertex = str(path[partCount]["NAME"]) 
            else:
                # Edge
                pathString += str(path[partCount][T.label]) 
                edge_properties_array = [ key + ':' + path[partCount][key] for key in path[partCount].keys() if key not in [Direction.OUT, Direction.IN, T.id, T.label, "ROLE"]]
                if len(edge_properties_array) > 0:
                    pathString += ' (' + ','.join(edge_properties_array) + ')'
                
                if path[partCount][Direction.IN][T.id] == path[partCount-1][T.id]:
                    pathString += ' <-- '
                else:
                    pathString += ' --> '   
            partCount += 1
        pathStrings.append({
            "path": pathString,
            "interested_entity": lastVertex
        })
    return pathStrings
