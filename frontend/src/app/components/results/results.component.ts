import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-results',
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Processing Results</mat-card-title>
      </mat-card-header>
      
      <mat-card-content>
        <div class="result-item">
          <strong>Status:</strong> 
          <span class="success">{{ results.success ? 'Success' : 'Failed' }}</span>
        </div>
        
        <div class="result-item" *ngIf="results.message">
          <strong>Message:</strong> {{ results.message }}
        </div>
        
        <div class="result-item" *ngIf="results.graphId">
          <strong>Graph ID:</strong> 
          <code>{{ results.graphId }}</code>
        </div>
        
        <div class="result-item" *ngIf="results.graphUri">
          <strong>Graph URI:</strong> 
          <code>{{ results.graphUri }}</code>
        </div>
        
        <div class="result-item" *ngIf="results.sparqlEndpoint">
          <strong>SPARQL Endpoint:</strong> 
          <a [href]="results.sparqlEndpoint" target="_blank">{{ results.sparqlEndpoint }}</a>
        </div>
        
        <div class="result-item" *ngIf="results.virtuosoWebInterface">
          <strong>Browse Data (Virtuoso):</strong> 
          <a [href]="results.virtuosoWebInterface" target="_blank">{{ results.virtuosoWebInterface }}</a>
        </div>
        
        <div class="actions" *ngIf="results.success">
          <button 
            mat-raised-button 
            color="primary"
            (click)="openSparqlEndpoint()">
            <mat-icon>search</mat-icon>
            Query SPARQL
          </button>
          
          <button 
            mat-raised-button 
            color="accent"
            (click)="openVirtuoso()">
            <mat-icon>visibility</mat-icon>
            Browse Data
          </button>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .result-item {
      margin-bottom: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    
    .result-item:last-of-type {
      border-bottom: none;
    }
    
    .success {
      color: #4caf50;
      font-weight: 500;
    }
    
    code {
      background-color: #f5f5f5;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    
    .actions {
      margin-top: 20px;
      display: flex;
      gap: 10px;
    }
    
    a {
      color: #1976d2;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
  `]
})
export class ResultsComponent {
  @Input() results: any;

  openSparqlEndpoint() {
    if (this.results?.sparqlEndpoint) {
      window.open(this.results.sparqlEndpoint, '_blank');
    }
  }

  openVirtuoso() {
    if (this.results?.virtuosoWebInterface) {
      window.open(this.results.virtuosoWebInterface, '_blank');
    }
  }
}
