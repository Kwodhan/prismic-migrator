import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AssetService } from '../../../services/asset.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssetList } from '../asset-list/asset-list';
import {AssetFile} from '@shared/types';

@Component({
  selector: 'target-asset-list',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatProgressBarModule, MatTooltipModule],
  templateUrl: './target-asset-list.html',
  styleUrl: './target-asset-list.css',
})
export class TargetAssetList extends AssetList implements OnInit, OnDestroy {
  private readonly assetService = inject(AssetService);
  private readonly snackBar = inject(MatSnackBar);

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

    const asset: AssetFile = JSON.parse(data);
    this.migrating.set(true);
    this.assetService.migrateAsset(asset.url, this.repository(),asset.filename).subscribe({
      next: result => {
        this.migrating.set(false);
        if (result.success) {
          this.refreshNeeded.emit();
          this.snackBar.open(`✅ "${result.filename}" migrated successfully`, 'Close', {
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
      error: err => {
        this.migrating.set(false);
        this.snackBar.open(`❌ Network error: ${err.message ?? 'unreachable'}`, 'Close', {
          duration: 6000,
          panelClass: ['snack-error'],
          horizontalPosition: 'end',
          verticalPosition: 'top',
        });
      }
    });
  }
}
