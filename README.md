# NIF Document Analyzer

A web application for analyzing documents using the NIF (Natural Language Processing Interchange Format) vocabulary and storing the results in a knowledge graph.

## Architecture

- **Frontend**: Angular 16 with Angular Material UI
- **Backend**: Python Flask API with uv package manager
- **Triple Store**: Virtuoso for RDF data storage
- **Visualization**: LODView for browsing RDF data
- **Deployment**: Docker containers orchestrated with Docker Compose

## Features

- Upload PDF documents or paste text directly
- Extract text structure (documents, paragraphs, sentences)
- Convert to NIF RDF format with unique URIs
- Store in Virtuoso triple store
- Browse data via SPARQL endpoint and LODView
- Support for English and German languages

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Running with Docker

1. Build and start all services:
```bash
docker-compose up --build
```

2. Access the application:
- Frontend: http://localhost:4200
- Backend API: http://localhost:5000
- Virtuoso SPARQL: http://localhost:8890/sparql
- LODView: http://localhost:8080

### Local Development

#### Frontend Development

```bash
cd frontend
npm install
npm start
```

#### Backend Development

```bash
cd backend
# Install uv if not already installed
pip install uv

# Install dependencies
uv sync

# Run the Flask application
uv run flask run
```

## NIF Vocabulary Implementation

The application implements the NIF Core vocabulary:

- **Document Context**: Main document with metadata (name, language)
- **Paragraphs**: Text blocks within the document
- **Sentences**: Individual sentences with precise character offsets
- **Named Graphs**: Each document creates a unique named graph
- **Language Support**: English (lexvo:eng) and German (lexvo:deu)

### Example RDF Output

```turtle
@prefix nif: <http://persistence.uni-leipzig.de/nlp2rdf/ontologies/nif-core#> .
@prefix schema: <http://schema.org/> .
@prefix lexvo: <http://lexvo.org/id/iso639-3/> .

<http://localhost/graph/{graph-id}> {
    <http://localhost/resource/{doc-id}> a nif:Context , nif:String ;
        nif:isString "Document text..." ;
        nif:beginIndex "0"^^xsd:int ;
        nif:endIndex "100"^^xsd:int ;
        schema:name "Document Name" ;
        nif:predLang lexvo:eng .
}
```

## API Endpoints

- `POST /process` - Process document text
- `GET /health` - Health check
- `GET /sparql` - Get SPARQL endpoint info

## Configuration

### Environment Variables

- `VIRTUOSO_URL` - Virtuoso server URL (default: http://localhost:8890)
- `FLASK_ENV` - Flask environment (development/production)

### Docker Services

- **frontend**: nginx:alpine serving Angular app
- **backend**: Python Flask API with uv
- **virtuoso**: openlink/virtuoso-opensource-7 triple store

## Development Notes

- The frontend uses Angular Material for UI components
- PDF text extraction is placeholder (needs PDF.js implementation)
- Backend uses SPARQLWrapper for Virtuoso communication
- Text processing includes basic sentence/paragraph splitting
- All resources get unique UUIDs for RDF URIs

## License

This project is for educational/research purposes.