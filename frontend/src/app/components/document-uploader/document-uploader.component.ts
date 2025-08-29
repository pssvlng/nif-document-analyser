
import { Component, EventEmitter, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as pdfjsLib from 'pdfjs-dist';
import { DocumentService } from '../../services/document.service';
import { ProcessingDialogComponent } from '../processing-dialog/processing-dialog.component';
// @ts-ignore
// Use worker entry for Angular/Webpack
// Removed import for pdf.worker.entry; use CDN path for workerSrc

@Component({
  selector: 'app-document-uploader',
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Document Upload & Processing</mat-card-title>
      </mat-card-header>
      
      <mat-card-content>
        <div class="upload-section">
          <input 
            type="file" 
            #fileInput 
            (change)="onFileSelected($event)"
            accept=".pdf"
            style="display: none">
          
          <button 
            mat-raised-button 
            color="primary" 
            (click)="fileInput.click()">
            <mat-icon>upload_file</mat-icon>
            Upload PDF
          </button>
          
          <span *ngIf="selectedFile" class="file-name">
            {{ selectedFile.name }}
          </span>
        </div>
        
        <div class="text-section">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Document Text</mat-label>
            <textarea 
              matInput 
              [(ngModel)]="documentText"
              rows="15"
              placeholder="Paste your text here or upload a PDF file above...">
            </textarea>
          </mat-form-field>
        </div>
        
        <div class="submit-section">
          <button 
            mat-raised-button 
            color="accent"
            [disabled]="!documentText.trim()"
            (click)="openProcessingDialog()">
            <mat-icon>psychology</mat-icon>
            Process Document
          </button>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .upload-section {
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .file-name {
      color: #666;
      font-style: italic;
    }
    
    .text-section {
      margin-bottom: 20px;
    }
    
    .full-width {
      width: 100%;
    }
    
    .submit-section {
      text-align: center;
    }
  `]
})

export class DocumentUploaderComponent {
  @Output() documentProcessed = new EventEmitter<any>();
  documentText = '';
  selectedFile: File | null = null;

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private documentService: DocumentService
  ) {
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
      this.extractTextFromPDF(file);
    } else {
      this.snackBar.open('Please select a valid PDF file', 'Close', {
        duration: 3000
      });
    }
  }

  async extractTextFromPDF(file: File) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // Group items by line (y position)
        const lines: { y: number, str: string }[] = [];
        for (const item of content.items) {
          if (item.str && typeof item.transform === 'object') {
            lines.push({ y: item.transform[5], str: item.str });
          }
        }
        // Sort lines by y position (top to bottom)
        lines.sort((a, b) => a.y - b.y);
        let prevY = null;
        let avgLineHeight = 0;
        let lineHeights: number[] = [];
        // Calculate average line height
        for (let j = 1; j < lines.length; j++) {
          lineHeights.push(Math.abs(lines[j].y - lines[j-1].y));
        }
        if (lineHeights.length > 0) {
          avgLineHeight = lineHeights.reduce((a, b) => a + b, 0) / lineHeights.length;
        }
        let paragraph = '';
        for (let j = 0; j < lines.length; j++) {
          const line = lines[j];
          if (prevY !== null && Math.abs(line.y - prevY) > avgLineHeight * 1.5) {
            text += paragraph.trim() + '\n\n'; // Paragraph break
            paragraph = '';
          }
          paragraph += line.str + ' ';
          prevY = line.y;
        }
        if (paragraph.trim()) {
          text += paragraph.trim() + '\n';
        }
      }
      this.documentText = text.trim();
      this.snackBar.open('PDF text extracted successfully!', 'Close', {
        duration: 3000
      });
    } catch (err) {
      console.error('PDF extraction error:', err);
      const errorMsg = (err && (err as any).message) ? (err as any).message : err;
      this.snackBar.open('Failed to extract text from PDF: ' + errorMsg, 'Close', {
        duration: 5000
      });
    }
  }

  openProcessingDialog() {
    const dialogRef = this.dialog.open(ProcessingDialogComponent, {
      width: '400px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.processDocument(result.documentName, result.language);
      }
    });
  }

  processDocument(documentName: string, language: string) {
    this.documentService.processDocument(this.documentText, documentName, language)
      .subscribe({
        next: (result) => {
          this.documentProcessed.emit(result);
          this.snackBar.open('Document processed successfully!', 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          this.snackBar.open('Error processing document: ' + error.message, 'Close', {
            duration: 5000
          });
        }
      });
  }
}
