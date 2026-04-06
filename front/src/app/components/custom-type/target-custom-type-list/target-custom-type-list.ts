import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { of, switchMap } from 'rxjs';
import { CustomTypeList } from '../custom-type-list/custom-type-list';
import { CustomTypeService } from '../../../services/custom-type.service';
import { CustomTypeDiffDialogComponent } from '../custom-type-diff-dialog/custom-type-diff-dialog.component';
import { CustomTypeMigrationResult } from '@shared/types';

@Component({
  selector: 'target-custom-type-list',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule,
  ],
  templateUrl: './target-custom-type-list.html',
  styleUrl: './target-custom-type-list.css',
})
export class TargetCustomTypeList extends CustomTypeList implements OnInit, OnDestroy {
  private readonly customTypeService = inject(CustomTypeService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  isDragOver = signal(false);
  migrating = signal(false);

  private readonly onDragEnd = (): void => this.isDragOver.set(false);

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

    const { repositorySource, customType } = JSON.parse(data);
    this.migrating.set(true);

    this.customTypeService
      .migrateCustomType(repositorySource, this.repository(), customType.id)
      .pipe(
        switchMap((result) => {
          if (result.error && result.target) {
            this.migrating.set(false);
            if (result.error === 'DIFF_CUSTOM_TYPE') {
              // Exists and different → open diff dialog
              const dialogRef = this.dialog.open(CustomTypeDiffDialogComponent, {
                width: '800px',
                maxWidth: '95vw',
                data: {
                  source: result.source,
                  target: result.target,
                  repoNameSource: repositorySource,
                  repoNameTarget: this.repository(),
                },
              });
              return dialogRef
                .afterClosed()
                .pipe(switchMap((migrated: CustomTypeMigrationResult) => of(migrated)));
            } else if (result.error === 'EXACTLY_SAME_CUSTOM_TYPE') {
              // Exists and same → open snackBar
              this.snackBar.open(`ℹ️ Custom types are identical, no changes were made`, 'Close', {
                duration: 4000,
                panelClass: ['snack-info'],
                horizontalPosition: 'end',
                verticalPosition: 'top',
              });
              return of(null);
            }
          }
          return of(result);
        }),
      )
      .subscribe({
        next: (result) => {
          this.migrating.set(false);
          if (!result) return; // dialog cancelled
          if (result.success) {
            this.refreshNeeded.emit();
            this.snackBar.open(`✅ "${result.source?.label}" migrated successfully`, 'Close', {
              duration: 4000,
              panelClass: ['snack-success'],
              horizontalPosition: 'end',
              verticalPosition: 'top',
            });
          } else {
            this.snackBar.open(`⚠️ Failure: ${result.error ?? 'unknown error'}`, 'Close', {
              duration: 6000,
              panelClass: ['snack-error'],
              horizontalPosition: 'end',
              verticalPosition: 'top',
            });
          }
        },
        error: (err) => {
          this.migrating.set(false);
          const message =
            err?.status === 403
              ? "❌ You don't have permission to migrate this custom type on this repository."
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
}
