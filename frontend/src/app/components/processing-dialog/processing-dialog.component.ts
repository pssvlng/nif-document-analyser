import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-processing-dialog',
  template: `
    <h2 mat-dialog-title>Document Processing</h2>
    
    <mat-dialog-content>
      <form [formGroup]="processingForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Document Name</mat-label>
          <input matInput formControlName="documentName" placeholder="Enter document name">
          <mat-error *ngIf="processingForm.get('documentName')?.hasError('required')">
            Document name is required
          </mat-error>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Language</mat-label>
          <mat-select formControlName="language">
            <mat-option value="english">English</mat-option>
            <mat-option value="german">German</mat-option>
          </mat-select>
          <mat-error *ngIf="processingForm.get('language')?.hasError('required')">
            Language is required
          </mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button 
        mat-raised-button 
        color="primary" 
        [disabled]="processingForm.invalid"
        (click)="onSubmit()">
        Process
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
    
    mat-dialog-content {
      min-width: 300px;
    }
  `]
})
export class ProcessingDialogComponent {
  processingForm: FormGroup;

  constructor(
    private dialogRef: MatDialogRef<ProcessingDialogComponent>,
    private fb: FormBuilder
  ) {
    this.processingForm = this.fb.group({
      documentName: ['', Validators.required],
      language: ['english', Validators.required]
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSubmit() {
    if (this.processingForm.valid) {
      this.dialogRef.close(this.processingForm.value);
    }
  }
}
