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
import { switchMap, of } from 'rxjs';
import { CustomTypeList } from '../custom-type-list/custom-type-list';
import { CustomType, CustomTypeService } from '../../../services/custom-type.service';
import { CustomTypeDiffDialogComponent } from '../custom-type-diff-dialog/custom-type-diff-dialog.component';

@Component({
  selector: 'target-custom-type-list',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatTooltipModule, MatProgressBarModule],
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

    const source: CustomType = JSON.parse(data);
    this.migrating.set(true);

    this.customTypeService.migrateCustomType(source.id).pipe(
      switchMap(result => {
        if (result.error === 'ALREADY_EXISTS' && result.target) {
          this.migrating.set(false);

          // Vérifier si source et target sont identiques
          if (JSON.stringify(source.json) === JSON.stringify(result.target.json)) {
            this.snackBar.open(`ℹ️ Les CustomType sont identiques, aucun changement n'a été fait`, 'Fermer', {
              duration: 4000, panelClass: ['snack-info'],
              horizontalPosition: 'end', verticalPosition: 'top',
            });
            return of(null);
          }

          // Existe et différent → ouvrir la dialog de diff
          const dialogRef = this.dialog.open(CustomTypeDiffDialogComponent, {
            width: '800px',
            maxWidth: '95vw',
            data: { source, target: result.target },
          });
          return dialogRef.afterClosed().pipe(
            switchMap(confirmed => confirmed
              ? this.customTypeService.updateCustomType(source.id)
              : of(null)
            )
          );
        }
        return of(result);
      })
    ).subscribe({
      next: result => {
        this.migrating.set(false);
        if (!result) return; // dialog annulée
        if (result.success) {
          this.refreshNeeded.emit();
          this.snackBar.open(`✅ "${result.label}" migré avec succès`, 'Fermer', {
            duration: 4000, panelClass: ['snack-success'],
            horizontalPosition: 'end', verticalPosition: 'top',
          });
        } else {
          this.snackBar.open(`⚠️ Échec : ${result.error ?? 'erreur inconnue'}`, 'Fermer', {
            duration: 6000, panelClass: ['snack-error'],
            horizontalPosition: 'end', verticalPosition: 'top',
          });
        }
      },
      error: err => {
        this.migrating.set(false);
        this.snackBar.open(`❌ Erreur réseau : ${err.message ?? 'injoignable'}`, 'Fermer', {
          duration: 6000, panelClass: ['snack-error'],
          horizontalPosition: 'end', verticalPosition: 'top',
        });
      }
    });
  }
}
