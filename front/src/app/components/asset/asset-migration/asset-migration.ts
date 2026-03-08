import { Component, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { SourceAssetList } from '../source-asset-list/source-asset-list';
import { TargetAssetList } from '../target-asset-list/target-asset-list';
import { AssetService } from '../../../services/asset.service';
import { ConfigService } from '../../../services/config.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import {AssetFile} from '@shared/types';

@Component({
  selector: 'asset-migration',
  imports: [SourceAssetList, TargetAssetList, MatProgressBarModule, MatToolbarModule, MatIconModule],
  templateUrl: './asset-migration.html',
  styleUrl: './asset-migration.css',
})
export class AssetMigration implements OnInit {
  private readonly assetService = inject(AssetService);
  private readonly configService = inject(ConfigService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  sourceAssets = signal<AssetFile[]>([]);
  targetAssets = signal<AssetFile[]>([]);
  loading = signal(true);
  sourceRepository = signal('');
  targetRepository = signal('');
  sourceFilter = signal('');
  targetFilter = signal('');

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.sourceFilter.set(params.get('sourceFilter') ?? '');
    this.targetFilter.set(params.get('targetFilter') ?? '');

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

  onSourceFilterChange(filter: string): void {
    this.sourceFilter.set(filter);
    this.updateQueryParams();
  }

  onTargetFilterChange(filter: string): void {
    this.targetFilter.set(filter);
    this.updateQueryParams();
  }

  private updateQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        sourceFilter: this.sourceFilter() || null,
        targetFilter: this.targetFilter() || null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  loadTargetAssets(): void {
    this.assetService.getTargetAssets().subscribe(assets => this.targetAssets.set(assets));
  }

  loadSourceAssets(): void {
    this.assetService.getSourceAssets().subscribe(assets => this.sourceAssets.set(assets));
  }
}

