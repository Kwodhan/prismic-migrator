import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { DocumentList } from '../document-list/document-list';
import { DocumentService } from '../../../services/document.service';
import { DocumentValidationDialogComponent } from '../document-validation-dialog/document-validation-dialog.component';
import { DocumentMigrationResult } from '@shared/types';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'target-document-list',
  imports: [
    FormsModule,
    DatePipe,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatAutocompleteModule,
  ],
  templateUrl: './target-document-list.html',
  styleUrl: './target-document-list.css',
})
export class TargetDocumentList extends DocumentList implements OnInit, OnDestroy {
  isDragOver = signal(false);
  migrating = signal(false);
  private readonly documentService = inject(DocumentService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  ngOnInit(): void {
    document.addEventListener('dragend', this.onDragEnd);
  }

  ngOnDestroy(): void {
    document.removeEventListener('dragend', this.onDragEnd);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(): void {
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);

    const data = event.dataTransfer?.getData('application/json');
    if (!data) return;

    const { repositorySource, document } = JSON.parse(data);
    this.migrating.set(true);

    this.documentService
      .getReportMigrateDocument(repositorySource, this.repository(), document.id)
      .subscribe({
        next: (result: DocumentMigrationResult) => {
          this.migrating.set(false);

          this.dialog.open(DocumentValidationDialogComponent, {
            width: '800px',
            maxWidth: '95vw',
            data: {
              validation: result.validation,
              docLabel: document.uid ?? document.id,
              docId: document.id,
              repoNameSource: repositorySource,
              repoNameTarget: this.repository(),
            },
          });
        },
        error: (err) => {
          this.migrating.set(false);
          const message =
            err?.status === 403
              ? "❌ You don't have permission to migrate this document on this repository."
              : `❌ Network error: ${err.message ?? 'unreachable'}`;

          this.snackBar.open(message, 'Close', {
            duration: 6000,
            panelClass: ['snack-error'],
            horizontalPosition: 'end',
            verticalPosition: 'top',
          });
        },
      });
  }

  private readonly onDragEnd = (): void => this.isDragOver.set(false);
}
