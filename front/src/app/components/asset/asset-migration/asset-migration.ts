import { Component, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { SourceAssetList } from '../source-asset-list/source-asset-list';
import { TargetAssetList } from '../target-asset-list/target-asset-list';
import { AssetService } from '../../../services/asset.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { AssetFile } from '@shared/types';
import { EnvironmentStorageService } from '../../../services/environment-storage.service';

@Component({
  selector: 'asset-migration',
  imports: [
    SourceAssetList,
    TargetAssetList,
    MatProgressBarModule,
    MatToolbarModule,
    MatIconModule,
  ],
  templateUrl: './asset-migration.html',
  styleUrl: './asset-migration.css',
})
export class AssetMigration implements OnInit {
  sourceAssets = signal<AssetFile[]>([]);
  targetAssets = signal<AssetFile[]>([]);
  loading = signal(true);
  sourceRepository = signal('');
  targetRepository = signal('');
  sourceFilter = signal('');
  targetFilter = signal('');
  private readonly assetService = inject(AssetService);
  private readonly storageService = inject(EnvironmentStorageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const source = this.storageService.getRepoNameSource();
    const target = this.storageService.getRepoNameTarget();

    if (!source || !target) {
      this.router.navigate(['/']);
      return;
    }
    this.sourceRepository.set(source);
    this.targetRepository.set(target);

    const params = this.route.snapshot.queryParamMap;
    this.sourceFilter.set(params.get('sourceFilter') ?? '');
    this.targetFilter.set(params.get('targetFilter') ?? '');

    forkJoin({
      source: this.assetService.getAssets(this.sourceRepository()),
      target: this.assetService.getAssets(this.targetRepository()),
    }).subscribe(({ source, target }) => {
      this.sourceAssets.set(source);
      this.targetAssets.set(target);

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

  loadTargetAssets(): void {
    this.assetService.getAssets(this.targetRepository()).subscribe((assets) => this.targetAssets.set(assets));
  }

  loadSourceAssets(): void {
    this.assetService.getAssets(this.sourceRepository()).subscribe((assets) => this.sourceAssets.set(assets));
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
}
