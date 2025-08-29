from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
import re
from datetime import datetime
from urllib.parse import quote
from rdflib import Graph, Namespace, URIRef, Literal, BNode
from rdflib.namespace import RDF, RDFS, XSD
from SPARQLWrapper import SPARQLWrapper, POST, JSON
import os

app = Flask(__name__)
CORS(app)

# Define namespaces
NIF = Namespace("http://persistence.uni-leipzig.de/nlp2rdf/ontologies/nif-core#")
SCHEMA = Namespace("http://schema.org/")
LEXVO = Namespace("http://lexvo.org/id/iso639-3/")

# Virtuoso configuration
VIRTUOSO_URL = os.getenv('VIRTUOSO_URL', 'http://localhost:8890')  # Keep for Virtuoso endpoint
LODVIEW_URL = 'http://localhost:8080'  # For resource URIs
SPARQL_ENDPOINT = f"{VIRTUOSO_URL}/sparql"
SPARQL_UPDATE_ENDPOINT = f"{VIRTUOSO_URL}/sparql-auth"

class NIFProcessor:
    """Process text into NIF format and store in Virtuoso"""
    
    def __init__(self):
        self.sparql = SPARQLWrapper(SPARQL_ENDPOINT)
        self.sparql.setMethod(POST)
        self.sparql.setReturnFormat(JSON)
        # Add authentication for Virtuoso
        self.sparql.setCredentials("dba", "dba")
        # Set additional headers for Virtuoso compatibility
        self.sparql.addCustomHttpHeader("Accept", "application/json")
        self.sparql.addCustomHttpHeader("Content-Type", "application/sparql-update")
    
    def generate_uuid(self):
        """Generate a UUID for resources"""
        return str(uuid.uuid4())
    
    def create_resource_uri(self, resource_id):
        """Create resource URI that works with Virtuoso web interface"""
        return URIRef(f"{LODVIEW_URL}/resource/{resource_id}")
    
    def create_graph_uri(self, graph_id):
        """Create named graph URI"""
        return URIRef(f"{LODVIEW_URL}/graph/{graph_id}")
    
    def split_into_paragraphs(self, text, language=None):
        # Fast paragraph splitting using double newlines
        paragraphs = re.split(r'\n\s*\n', text.strip())
        return [p.strip() for p in paragraphs if p.strip()]

    def split_into_sentences(self, text, language=None):
        # Naive sentence splitting using regex
        # Splits on period, exclamation, or question mark followed by whitespace or end of string
        sentence_endings = re.compile(r'(?<=[.!?])\s+')
        sentences = sentence_endings.split(text.strip())
        return [s.strip() for s in sentences if s.strip()]
    
    def process_document(self, text, document_name, language):
        """Process document text into NIF format"""
        # Generate IDs
        graph_id = self.generate_uuid()
        document_id = self.generate_uuid()

        # Create graph and URIs
        g = Graph()
        graph_uri = self.create_graph_uri(graph_id)
        document_uri = self.create_resource_uri(document_id)

        # Bind namespaces
        g.bind("nif", NIF)
        g.bind("rdf", RDF)
        g.bind("rdfs", RDFS)
        g.bind("xsd", XSD)
        g.bind("schema", SCHEMA)
        g.bind("lexvo", LEXVO)

        # Set language URI
        lang_uri = LEXVO.eng if language == 'english' else LEXVO.deu

        # Create document context
        g.add((document_uri, RDF.type, NIF.Context))
        g.add((document_uri, RDF.type, NIF.String))
        g.add((document_uri, NIF.isString, Literal(text)))
        g.add((document_uri, NIF.beginIndex, Literal(0, datatype=XSD.int)))
        g.add((document_uri, NIF.endIndex, Literal(len(text), datatype=XSD.int)))
        g.add((document_uri, RDFS.isDefinedBy, graph_uri))
        g.add((document_uri, SCHEMA.name, Literal(document_name)))
        g.add((document_uri, NIF.predLang, lang_uri))

        # Process paragraphs
        paragraphs = self.split_into_paragraphs(text, language)
        current_offset = 0

        for para_text in paragraphs:
            # Find paragraph position in original text
            para_start = text.find(para_text, current_offset)
            para_end = para_start + len(para_text)

            # Create paragraph
            para_id = self.generate_uuid()
            para_uri = self.create_resource_uri(para_id)

            g.add((para_uri, RDF.type, NIF.Paragraph))
            g.add((para_uri, RDF.type, NIF.Context))
            g.add((para_uri, RDF.type, NIF.String))
            g.add((para_uri, NIF.referenceContext, document_uri))
            g.add((para_uri, NIF.isString, Literal(para_text)))
            g.add((para_uri, NIF.beginIndex, Literal(para_start, datatype=XSD.int)))
            g.add((para_uri, NIF.endIndex, Literal(para_end, datatype=XSD.int)))
            g.add((para_uri, RDFS.isDefinedBy, graph_uri))

            # Process sentences within paragraph
            sentences = self.split_into_sentences(para_text, language)
            sent_offset = 0

            for sent_text in sentences:
                # Find sentence position within paragraph
                sent_start_in_para = para_text.find(sent_text, sent_offset)
                sent_start = para_start + sent_start_in_para
                sent_end = sent_start + len(sent_text)

                # Create sentence
                sent_id = self.generate_uuid()
                sent_uri = self.create_resource_uri(sent_id)

                g.add((sent_uri, RDF.type, NIF.Sentence))
                g.add((sent_uri, RDF.type, NIF.String))
                g.add((sent_uri, NIF.referenceContext, para_uri))
                g.add((sent_uri, NIF.isString, Literal(sent_text)))
                g.add((sent_uri, NIF.beginIndex, Literal(sent_start, datatype=XSD.int)))
                g.add((sent_uri, NIF.endIndex, Literal(sent_end, datatype=XSD.int)))
                g.add((sent_uri, RDFS.isDefinedBy, graph_uri))

                sent_offset = sent_start_in_para + len(sent_text)

            current_offset = para_end

        return g, graph_uri, graph_id
    
    def store_in_virtuoso(self, graph, graph_uri, batch_size=1000):
        """Store the entire RDF graph in Virtuoso with a single SPARQL UPDATE request.

        NOTE: This removes the previous batching behavior and sends one INSERT DATA
        containing all triples. If the graph is very large this may hit server or
        client limits.
        """
        try:
            import requests
            import base64

            triples = list(graph)
            total = len(triples)
            print(f"Total triples to store: {total}")

            auth_endpoint = SPARQL_UPDATE_ENDPOINT
            auth_string = base64.b64encode(b"dba:dba").decode('ascii')
            headers = {
                'Content-Type': 'application/sparql-update',
                'Authorization': f'Basic {auth_string}'
            }

            query = f"""
            PREFIX nif: <http://persistence.uni-leipzig.de/nlp2rdf/ontologies/nif-core#>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
            PREFIX schema: <http://schema.org/>
            PREFIX lexvo: <http://lexvo.org/id/iso639-3/>
            INSERT DATA {{
                GRAPH {graph_uri.n3()} {{
            """

            for s, p, o in triples:
                query += f"        {s.n3()} {p.n3()} {o.n3()} .\n"

            query += """    }
            }"""

            print("Storing all triples in a single request")
            response = requests.post(auth_endpoint, data=query.encode('utf-8'), headers=headers, timeout=120)
            print(f"Store response: {response.status_code}")
            if response.status_code != 200:
                print(f"Error storing data: {response.status_code} {response.text}")
                return False

            print("All triples stored successfully!")
            return True
        except Exception as e:
            print(f"Exception storing in Virtuoso: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return False

# Initialize processor
processor = NIFProcessor()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.route('/process', methods=['POST'])
def process_document():
    """Process document text into NIF format"""
    print("--- Incoming /process request ---")
    print(f"Method: {request.method}")
    print(f"Headers: {dict(request.headers)}")
    #print(f"Data: {request.data}")
    #print(f"JSON: {request.get_json(silent=True)}")
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        text = data.get('text', '').strip()
        document_name = data.get('documentName', '').strip()
        language = data.get('language', 'english').lower()
        
        if not text:
            return jsonify({"error": "Text is required"}), 400
        
        if not document_name:
            return jsonify({"error": "Document name is required"}), 400
        
        if language not in ['english', 'german']:
            return jsonify({"error": "Language must be 'english' or 'german'"}), 400
        
        # Process the document
        graph, graph_uri, graph_id = processor.process_document(text, document_name, language)
        
        # Store in Virtuoso
        success = processor.store_in_virtuoso(graph, graph_uri)
        
        if success:
            # Generate proper browsable URLs
            base_url = LODVIEW_URL
            graph_browse_url = f"{base_url}/sparql?default-graph-uri=&query=DESCRIBE+%3C{quote(str(graph_uri), safe='')}%3E&format=text%2Fhtml"
            
            # Generate sample resource URLs for browsing
            sample_resources = []
            for s, p, o in graph:
                if str(s).startswith(f'{LODVIEW_URL}/resource/'):
                    resource_url = f"{base_url}/sparql?default-graph-uri=&query=DESCRIBE+%3C{quote(str(s), safe='')}%3E&format=text%2Fhtml"
                    sample_resources.append({
                        "uri": str(s),
                        "browseUrl": resource_url
                    })
                    if len(sample_resources) >= 3:  # Limit to first 3 resources
                        break
            
            return jsonify({
                "success": True,
                "message": "Document processed successfully",
                "graphId": graph_id,
                "graphUri": str(graph_uri),
                "graphBrowseUrl": graph_browse_url,
                "sampleResources": sample_resources,
                "sparqlEndpoint": SPARQL_ENDPOINT,
                "virtuosoWebInterface": f"{base_url}/sparql",
                "virtuosoAdmin": f"{base_url}/admin"
            })
        else:
            return jsonify({"error": "Failed to store data in triple store"}), 500
            
    except Exception as e:
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500

@app.route('/sparql', methods=['GET'])
def get_sparql_endpoint():
    """Get SPARQL endpoint URL"""
    return jsonify({
        "sparqlEndpoint": SPARQL_ENDPOINT,
        "virtuosoUrl": VIRTUOSO_URL
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
