import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {ValidationIssue, ValidationResult} from '@shared/types';

interface DialogData {
  success: boolean;
  validation: ValidationResult | null;
  docLabel: string;
  docTargetId: string;
  targetRepo: string;
}

@Component({
  selector: 'document-validation-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './document-validation-dialog.component.html',
})
export class DocumentValidationDialogComponent {
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);

  get pageUrl(): string {
    return `https://${this.data.targetRepo}.prismic.io/builder/pages/${this.data.docTargetId}`;
  }

  get migrationUrl(): string {
    return `https://${this.data.targetRepo}.prismic.io/builder/migration`;
  }

  get blockingIssues(): ValidationIssue[] {
    return this.data.validation?.issues.filter(i => i.severity === 'BLOCKING') ?? [];
  }

  get warningIssues(): ValidationIssue[] {
    return this.data.validation?.issues.filter(i => i.severity === 'WARNING') ?? [];
  }
}
