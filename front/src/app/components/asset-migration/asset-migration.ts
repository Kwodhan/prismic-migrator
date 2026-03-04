import { Component, inject, OnInit, signal } from '@angular/core';
import { AssetList } from '../asset-list/asset-list';
import { AssetFile, AssetService } from '../../services/asset.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-asset-migration',
  imports: [AssetList, MatProgressBarModule, MatToolbarModule, MatIconModule],
  templateUrl: './asset-migration.html',
  styleUrl: './asset-migration.css',
})
export class AssetMigration implements OnInit {
  private readonly assetService = inject(AssetService);

  sourceAssets = signal<AssetFile[]>([]);
  targetAssets = signal<AssetFile[]>([]);
  isDragOver = signal(false);
  loading = signal(true);
  migrating = signal(false);

  ngOnInit(): void {
    this.assetService.getSourceAssets().subscribe(assets => {
      this.sourceAssets.set(assets);
      this.loading.set(false);
    });
    this.assetService.getTargetAssets().subscribe(assets => this.targetAssets.set(assets));
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
    this.assetService.migrateAsset(asset.url, asset.filename).subscribe(result => {
      console.log('[Migration] résultat :', result);
      this.migrating.set(false);
    });
  }
}
