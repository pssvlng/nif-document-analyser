import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProcessDocumentRequest {
  text: string;
  documentName: string;
  language: string;
}

export interface ProcessDocumentResponse {
  success: boolean;
  message: string;
  graphId?: string;
  graphUri?: string;
  sparqlEndpoint?: string;
  lodviewUrl?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  processDocument(text: string, documentName: string, language: string): Observable<ProcessDocumentResponse> {
    const request: ProcessDocumentRequest = {
      text,
      documentName,
      language
    };

    return this.http.post<ProcessDocumentResponse>(`${this.apiUrl}/process`, request);
  }

  getSparqlEndpoint(): Observable<any> {
    return this.http.get(`${this.apiUrl}/sparql`);
  }

  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }
}
