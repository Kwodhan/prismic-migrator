import { Component, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { SourceAssetList } from '../source-asset-list/source-asset-list';
import { TargetAssetList } from '../target-asset-list/target-asset-list';
import { AssetFile, AssetService } from '../../../services/asset.service';
import { ConfigService } from '../../../services/config.service';
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
  private readonly configService = inject(ConfigService);

  sourceAssets = signal<AssetFile[]>([]);
  targetAssets = signal<AssetFile[]>([]);
  loading = signal(true);
  sourceRepository = signal('');
  targetRepository = signal('');

  ngOnInit(): void {
    forkJoin({
      source: this.assetService.getSourceAssets(),
      target: this.assetService.getTargetAssets(),
      config: this.configService.getConfig(),
    }).subscribe(({ source, target, config }) => {
      this.sourceAssets.set(source);
      this.targetAssets.set(target);
      this.sourceRepository.set(config.sourceRepository);
      this.targetRepository.set(config.destinationRepository);
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

