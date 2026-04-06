import { Component, inject, OnInit, signal } from '@angular/core';
import { catchError, forkJoin, finalize, of } from 'rxjs';
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
  sourceRequestError = signal<{ status?: number; message?: string } | null>(null);
  targetRequestError = signal<{ status?: number; message?: string } | null>(null);
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
    this.sourceRequestError.set(null);
    this.targetRequestError.set(null);

    forkJoin({
      source: this.assetService.getAssets(this.sourceRepository()).pipe(
        catchError((error: { status?: number; message?: string }) => {
          this.sourceRequestError.set({ status: error.status, message: error.message });
          return of([] as AssetFile[]);
        }),
      ),
      target: this.assetService.getAssets(this.targetRepository()).pipe(
        catchError((error: { status?: number; message?: string }) => {
          this.targetRequestError.set({ status: error.status, message: error.message });
          return of([] as AssetFile[]);
        }),
      ),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(({ source, target }) => {
        this.sourceAssets.set(source);
        this.targetAssets.set(target);
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
    this.assetService.getAssets(this.targetRepository()).subscribe({
      next: (assets) => {
        this.targetRequestError.set(null);
        this.targetAssets.set(assets);
      },
      error: (error: { status?: number; message?: string }) => {
        this.targetRequestError.set({ status: error.status, message: error.message });
      },
    });
  }

  loadSourceAssets(): void {
    this.assetService.getAssets(this.sourceRepository()).subscribe({
      next: (assets) => {
        this.sourceRequestError.set(null);
        this.sourceAssets.set(assets);
      },
      error: (error: { status?: number; message?: string }) => {
        this.sourceRequestError.set({ status: error.status, message: error.message });
      },
    });
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
