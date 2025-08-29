import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <mat-toolbar color="primary">
      <span>NIF Document Analyzer</span>
    </mat-toolbar>
    
    <div class="container">
      <app-document-uploader 
        (documentProcessed)="onDocumentProcessed($event)">
      </app-document-uploader>
      
      <app-results 
        *ngIf="results" 
        [results]="results">
      </app-results>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 20px auto;
      padding: 0 20px;
    }
  `]
})
export class AppComponent {
  results: any = null;

  onDocumentProcessed(results: any) {
    this.results = results;
  }
}
