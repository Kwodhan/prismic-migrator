import { Component, inject, OnInit, signal } from '@angular/core';
import { catchError, forkJoin, finalize, of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomTypeService } from '../../../services/custom-type.service';
import { SourceCustomTypeList } from '../source-custom-type-list/source-custom-type-list';
import { TargetCustomTypeList } from '../target-custom-type-list/target-custom-type-list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { CustomType } from '@shared/types';
import { EnvironmentStorageService } from '../../../services/environment-storage.service';

@Component({
  selector: 'custom-type-migration',
  imports: [SourceCustomTypeList, TargetCustomTypeList, MatProgressBarModule, MatIconModule],
  templateUrl: './custom-type-migration.html',
  styleUrl: './custom-type-migration.css',
})
export class CustomTypeMigration implements OnInit {
  sourceCustomTypes = signal<CustomType[]>([]);
  targetCustomTypes = signal<CustomType[]>([]);
  sourceRequestError = signal<{ status?: number; message?: string } | null>(null);
  targetRequestError = signal<{ status?: number; message?: string } | null>(null);
  loading = signal(true);
  sourceRepository = signal('');
  targetRepository = signal('');
  sourceFilter = signal('');
  targetFilter = signal('');
  private readonly customTypeService = inject(CustomTypeService);
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
      source: this.customTypeService.getCustomTypes(this.sourceRepository()).pipe(
        catchError((error: { status?: number; message?: string }) => {
          this.sourceRequestError.set({ status: error.status, message: error.message });
          return of([] as CustomType[]);
        }),
      ),
      target: this.customTypeService.getCustomTypes(this.targetRepository()).pipe(
        catchError((error: { status?: number; message?: string }) => {
          this.targetRequestError.set({ status: error.status, message: error.message });
          return of([] as CustomType[]);
        }),
      ),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ source, target }) => {
          this.sourceCustomTypes.set(source);
          this.targetCustomTypes.set(target);
        },
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

  loadSourceCustomTypes(): void {
    this.customTypeService
      .getCustomTypes(this.sourceRepository())
      .subscribe({
        next: (ct) => {
          this.sourceRequestError.set(null);
          this.sourceCustomTypes.set(ct);
        },
        error: (error: { status?: number; message?: string }) => {
          this.sourceRequestError.set({ status: error.status, message: error.message });
        },
      });
  }

  loadTargetCustomTypes(): void {
    this.customTypeService
      .getCustomTypes(this.targetRepository())
      .subscribe({
        next: (ct) => {
          this.targetRequestError.set(null);
          this.targetCustomTypes.set(ct);
        },
        error: (error: { status?: number; message?: string }) => {
          this.targetRequestError.set({ status: error.status, message: error.message });
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
