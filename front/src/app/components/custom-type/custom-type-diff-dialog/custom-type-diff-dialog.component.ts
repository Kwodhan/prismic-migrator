import { Component, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { create } from 'jsondiffpatch';
import * as htmlFormatter from 'jsondiffpatch/formatters/html';
import {CustomType} from '@shared/types';

export interface DiffDialogData {
  source: CustomType;
  target: CustomType;
}

@Component({
  selector: 'app-custom-type-diff-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <h2 mat-dialog-title class="flex items-center gap-2">
      <mat-icon>compare_arrows</mat-icon>
      Differences - {{ data.source.label }}
    </h2>

    <mat-dialog-content class="max-h-[70vh]! overflow-y-auto">
      <div class="flex gap-4 text-xs mb-3">
        <span class="flex items-center gap-1">
          <span class="inline-block w-3 h-3 rounded bg-red-200 border border-red-400"></span> Removed / before
        </span>
        <span class="flex items-center gap-1">
          <span class="inline-block w-3 h-3 rounded bg-green-200 border border-green-400"></span> Added / after
        </span>
      </div>
      <div class="jsondiffpatch-delta text-xs font-mono overflow-x-auto"
           [innerHTML]="diffHtml">
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-flat-button color="primary" (click)="confirm()">
        <mat-icon>sync</mat-icon> Update
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .jsondiffpatch-delta { font-family: monospace; font-size: 12px; }
    .jsondiffpatch-delta ul { list-style: none; padding: 0 0 0 16px; margin: 0; }
    .jsondiffpatch-delta li { padding: 1px 0; }

    .jsondiffpatch-added .jsondiffpatch-property-name,
    .jsondiffpatch-added .jsondiffpatch-value pre,
    .jsondiffpatch-modified .jsondiffpatch-right-value pre,
    .jsondiffpatch-textdiff-added {
      background: #d4edda;
      color: #155724;
    }

    .jsondiffpatch-deleted .jsondiffpatch-property-name,
    .jsondiffpatch-deleted .jsondiffpatch-value pre,
    .jsondiffpatch-modified .jsondiffpatch-left-value pre,
    .jsondiffpatch-textdiff-deleted {
      background: #f8d7da;
      color: #721c24;
      text-decoration: line-through;
    }

    .jsondiffpatch-unchanged { color: #999; }
    .jsondiffpatch-unchanged .jsondiffpatch-value pre { color: #999; }

    .jsondiffpatch-property-name {
      display: inline-block;
      padding: 0 4px;
      font-weight: bold;
      min-width: 120px;
    }

    .jsondiffpatch-value pre {
      display: inline;
      margin: 0;
      padding: 1px 4px;
      border-radius: 2px;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .jsondiffpatch-arrow { color: #999; margin: 0 4px; }
    .jsondiffpatch-moved-destination { color: #999; font-style: italic; }

    .jsondiffpatch-textdiff-added { text-decoration: none; }
    .jsondiffpatch-textdiff-deleted { text-decoration: line-through; }
  `],
})
export class CustomTypeDiffDialogComponent implements OnInit {
  readonly data: DiffDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<CustomTypeDiffDialogComponent>);

  diffHtml: string | undefined = '';

  ngOnInit(): void {
    const differ = create({ arrays: { detectMove: false } });
    const delta = differ.diff(this.data.target.json, this.data.source.json);
    this.diffHtml = delta
      ? htmlFormatter.format(delta, this.data.target.json)
      : '<p class="text-gray-400 italic">No differences in JSON.</p>';
  }

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
