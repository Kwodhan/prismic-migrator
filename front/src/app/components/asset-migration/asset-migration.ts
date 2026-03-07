import { Component, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { SourceAssetList } from '../source-asset-list/source-asset-list';
import { TargetAssetList } from '../target-asset-list/target-asset-list';
import { AssetFile, AssetService } from '../../services/asset.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'asset-migration',
  imports: [SourceAssetList, TargetAssetList, MatProgressBarModule, MatToolbarModule, MatIconModule],
  templateUrl: './asset-migration.html',
  styleUrl: './asset-migration.css',
})
export class AssetMigration implements OnInit {
  private readonly assetService = inject(AssetService);

  sourceAssets = signal<AssetFile[]>([]);
  targetAssets = signal<AssetFile[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    forkJoin({
      source: this.assetService.getSourceAssets(),
      target: this.assetService.getTargetAssets(),
    }).subscribe(({ source, target }) => {
      this.sourceAssets.set(source);
      this.targetAssets.set(target);
      this.loading.set(false);
    });
  }

  loadTargetAssets(): void {
    this.assetService.getTargetAssets().subscribe(assets => this.targetAssets.set(assets));
  }
  loadSourceAssets(): void {
    this.assetService.getSourceAssets().subscribe(assets => this.sourceAssets.set(assets));
  }
}

