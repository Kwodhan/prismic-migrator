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
import {DocumentMigrationResult, PrismicDocument} from '@shared/types';

@Component({
  selector: 'target-document-list',
  imports: [FormsModule, DatePipe, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatTooltipModule, MatProgressBarModule, MatAutocompleteModule],
  templateUrl: './target-document-list.html',
  styleUrl: './target-document-list.css',
})
export class TargetDocumentList extends DocumentList implements OnInit, OnDestroy {
  private readonly documentService = inject(DocumentService);
  private readonly dialog = inject(MatDialog);

  isDragOver = signal(false);
  migrating = signal(false);

  private readonly onDragEnd = (): void => this.isDragOver.set(false);

  ngOnInit(): void { document.addEventListener('dragend', this.onDragEnd); }
  ngOnDestroy(): void { document.removeEventListener('dragend', this.onDragEnd); }

  onDragOver(event: DragEvent): void { event.preventDefault(); this.isDragOver.set(true); }
  onDragLeave(): void { this.isDragOver.set(false); }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);

    const data = event.dataTransfer?.getData('application/json');
    if (!data) return;

    const doc: PrismicDocument = JSON.parse(data);
    this.migrating.set(true);

    this.documentService.migrateDocument(doc.id).subscribe({
      next: (result: DocumentMigrationResult) => {
        this.migrating.set(false);
        if (result.success) this.refreshNeeded.emit();

        this.dialog.open(DocumentValidationDialogComponent, {
          width: '700px',
          maxWidth: '95vw',
          data: {
            success: result.success,
            validation: result.validation,
            docLabel: doc.uid ?? doc.id,
            docTargetId: result.id,
            targetRepo: this.repository(),
          },
        });
      },
      error: () => {
        this.migrating.set(false);
        this.dialog.open(DocumentValidationDialogComponent, {
          width: '700px',
          maxWidth: '95vw',
          data: {
            success: false,
            validation: null,
            docLabel: doc.uid ?? doc.id,
            targetRepo: this.repository(),
          },
        });
      },
    });
  }
}
