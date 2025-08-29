import os
import requests
from requests.auth import HTTPDigestAuth
import urllib3
import time

VIRTUOSO_URL = os.getenv('VIRTUOSO_URL', 'http://localhost:8890')  # Keep for Virtuoso endpoint
SPARQL_ENDPOINT = f"{VIRTUOSO_URL}/sparql"

endpoint = f"{VIRTUOSO_URL}/sparql-graph-crud-auth"
username = 'dba'
password = 'dba'
retry=5

def storeDataToGraph(graph, data):
	"""Store serialized RDF data to Virtuoso under the given graph name.

	Returns True on success (HTTP 200/201), False on failure.
	"""

	if not graph:
		raise ValueError("No graph specified for virtuoso storage")

	http = urllib3.PoolManager()

	api_url = endpoint + '?graph=' + graph

	headers = {'Content-type': 'text/turtle'}
	response = None
	for i in range(retry):
		try:
			response = requests.post(api_url, data=data, headers=headers, auth=HTTPDigestAuth(username, password), timeout=10)
			break
		except Exception:
			time.sleep(2)

	# Clean up urllib3 pool
	http.clear()

	if response is None:
		print("Error: No Response from Server", flush=True)
		return False

	if response.status_code in (200, 201):
		return True
	else:
		print(f"Error: Status Code: {response.status_code}", flush=True)
		print(response.text, flush=True)
		return False