import { Component, inject, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { CommonModule } from '@angular/common';
import { create } from 'jsondiffpatch';
import * as htmlFormatter from 'jsondiffpatch/formatters/html';
import { CustomType, CustomTypeMigrationResult } from '@shared/types';

import { detailedDiff, DetailedDiff } from 'deep-object-diff';
import { CustomTypeService } from '../../../services/custom-type.service';

export interface DiffDialogData {
  source: CustomType;
  target: CustomType;
  repoNameSource: string;
  repoNameTarget: string;
}

export interface DiffLine {
  path: string;
  action: string;
  oldValue?: any;
  value?: any;
}

export interface ShowDiffLine {
  added: DiffLine[];
  deleted: DiffLine[];
  updated: DiffLine[];
}

@Component({
  selector: 'app-custom-type-diff-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatTabsModule, CommonModule],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './custom-type-diff-dialog.component.html',
  styleUrl: './custom-type-diff-dialog.component.css',
})
export class CustomTypeDiffDialogComponent implements OnInit {
  readonly data: DiffDialogData = inject(MAT_DIALOG_DATA);
  private readonly customTypeService = inject(CustomTypeService);
  private readonly dialogRef = inject(MatDialogRef<CustomTypeDiffDialogComponent>);
  loading = signal(false);
  diffHtml: string | undefined = '';
  diffStructured: ShowDiffLine | undefined;

  ngOnInit(): void {
    // Git diff view (jsondiffpatch)
    const differ = create({ arrays: { detectMove: false } });
    const delta = differ.diff(this.data.target.json, this.data.source.json);
    this.diffHtml = delta
      ? htmlFormatter.format(delta, this.data.target.json)
      : '<p class="text-gray-400 italic">No differences in JSON.</p>';

    this.diffStructured = this.formatDiff(this.data.target, this.data.source);
  }

  confirm(): void {
    this.loading.set(true);
    this.customTypeService.updateCustomType(this.data.repoNameSource,this.data.repoNameTarget,this.data.source.id).subscribe({
      next: (result: CustomTypeMigrationResult) => {
        this.loading.set(false);
        this.dialogRef.close(result);
      },
      error: (err) => {
        this.loading.set(false);
        this.dialogRef.close({
          success: false,
          error: err.message,
        });
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  public formatDiff(target: CustomType, source: CustomType): ShowDiffLine {
    const detailedDiffCustomType: DetailedDiff = detailedDiff(target.json, source.json);
    const show: ShowDiffLine = { added: [], deleted: [], updated: [] };
    // Process additions
    if (detailedDiffCustomType.added) {
      show.added = this.processDiff(detailedDiffCustomType.added, 'Added');
    }
    // Process deletions
    if (detailedDiffCustomType.deleted) {
      show.deleted = this.processDiff(detailedDiffCustomType.deleted, 'Delete', target.json);
    }
    // Process updates
    if (detailedDiffCustomType.updated) {
      show.updated = this.processDiff(detailedDiffCustomType.updated, 'Update', target.json);
    }
    return show;
  }

  private processDiff(obj: Record<string, any>, action: string, originalObject?: any): DiffLine[] {
    const lines: DiffLine[] = [];
    const traverse = (current: Record<string, any>, path: string[] = []) => {
      for (const [key, value] of Object.entries(current)) {
        const newPath = [...path, key];
        const oldValue = this.getValueByPath(originalObject, newPath);
        if (value === undefined) {
          lines.push({ path: newPath.join(' > '), action, oldValue });
        } else if (typeof value === 'object' && value !== null) {
          traverse(value, newPath);
        } else {
          lines.push({
            path: newPath.join(' > '),
            action,
            oldValue,
            value,
          });
        }
      }
    };

    traverse(obj);
    return lines;
  }

  private getValueByPath(obj: any, path: string[]): any {
    return path.reduce((acc, key) => {
      if (acc && typeof acc === 'object' && key in acc) {
        return acc[key];
      }
      return undefined;
    }, obj);
  }
}
