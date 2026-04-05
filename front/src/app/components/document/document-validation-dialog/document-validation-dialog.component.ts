import { Component, computed, inject, Signal, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  DocumentMigrationResult,
  ReportMigrationResult,
  ValidationIssue,
  ValidationResult,
} from '@shared/types';
import { DocumentService } from '../../../services/document.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

interface DialogData {
  validation: ValidationResult | null;
  docId: string;
  docLabel: string;
  repoNameSource: string;
  repoNameTarget: string;
}

@Component({
  selector: 'document-validation-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinner],
  templateUrl: './document-validation-dialog.component.html',
})
export class DocumentValidationDialogComponent {
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);
  private readonly documentService = inject(DocumentService);
  loading = signal(false);
  hasMigrated = signal(false);
  validation = signal<ValidationResult | null>(this.data.validation);
  success = signal(false);
  error = signal<string | null>(null);
  idTarget = signal<string | null>(null);
  blockingIssues: Signal<ValidationIssue[]> = computed(() => {
    const v = this.validation();
    if (v) {
      return v.issues.filter((i) => i.severity === 'BLOCKING');
    }
    return [];
  });
  warningIssues: Signal<ValidationIssue[]> = computed(() => {
    const v = this.validation();
    if (v) {
      return v.issues.filter((i) => i.severity === 'WARNING');
    }
    return [];
  });

  get pageUrl(): string {
    return `https://${this.data.repoNameTarget}.prismic.io/builder/pages/${this.idTarget()}`;
  }

  get migrationUrl(): string {
    return `https://${this.data.repoNameTarget}.prismic.io/builder/migration`;
  }

  onUpdateReport(): void {
    this.loading.set(true);
    this.documentService
      .getReportMigrateDocument(this.data.repoNameSource, this.data.repoNameTarget, this.data.docId)
      .subscribe({
        next: (result: ReportMigrationResult) => {
          this.validation.set(result.validation);
          this.loading.set(false);
        },
        error: () => {
          this.success.set(false);
          this.error.set(`Document ${this.data.docId} Validating failed.`);
          this.loading.set(false);
        },
      });
  }

  onMigrate(): void {
    this.loading.set(true);
    this.documentService
      .migrateDocument(this.data.repoNameSource, this.data.repoNameTarget, this.data.docId)
      .subscribe({
        next: (result: DocumentMigrationResult) => {
          this.validation.set(result.validation);
          this.success.set(result.success);
          this.error.set(result.error ?? null);
          this.idTarget.set(result.id ?? null);
          this.hasMigrated.set(result.success);
          this.loading.set(false);
        },
        error: () => {
          this.success.set(false);
          this.error.set(`Document ${this.data.docId} Migrating failed.`);
          this.loading.set(false);
        },
      });
  }
}
