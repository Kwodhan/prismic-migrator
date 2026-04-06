import { Component, inject, OnInit, signal } from '@angular/core';
import { catchError, forkJoin, finalize, of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { TargetDocumentList } from '../target-document-list/target-document-list';
import { SourceDocumentList } from '../source-document-list/source-document-list';
import { DocumentService } from '../../../services/document.service';
import { DocumentType } from '../document-list/document-list';
import { PaginatedDocuments, PrismicDocument } from '@shared/types';
import { EnvironmentStorageService } from '../../../services/environment-storage.service';

@Component({
  selector: 'document-migration',
  imports: [SourceDocumentList, TargetDocumentList, MatProgressBarModule, MatIconModule],
  templateUrl: './document-migration.html',
  styleUrl: './document-migration.css',
})
export class DocumentMigration implements OnInit {
  sourceDocuments = signal<PrismicDocument[]>([]);
  targetDocuments = signal<PrismicDocument[]>([]);
  sourcePage = signal(1);
  targetPage = signal(1);
  sourceTotalPages = signal(1);
  targetTotalPages = signal(1);
  sourceTotalDocuments = signal(0);
  targetTotalDocuments = signal(0);
  sourceLoading = signal(false);
  targetLoading = signal(false);
  initialLoading = signal(true);
  sourceRepository = signal('');
  targetRepository = signal('');
  sourceSearch = signal('');
  targetSearch = signal('');
  sourceTypes = signal<DocumentType[]>([]);
  targetTypes = signal<DocumentType[]>([]);
  sourceRequestError = signal<{ status?: number; message?: string } | null>(null);
  targetRequestError = signal<{ status?: number; message?: string } | null>(null);
  private readonly documentService = inject(DocumentService);
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
    const initialSourceType = params.get('sourceType') ?? '';
    const initialTargetType = params.get('targetType') ?? '';

    this.sourceSearch.set(initialSourceType);
    this.targetSearch.set(initialTargetType);
    this.sourceRequestError.set(null);
    this.targetRequestError.set(null);

    forkJoin({
      source: this.documentService.getDocuments(this.sourceRepository(), 1, initialSourceType).pipe(
        catchError((error: { status?: number; message?: string }) => {
          this.sourceRequestError.set({ status: error.status, message: error.message });
          return of(this.emptyPaginatedDocuments());
        }),
      ),
      target: this.documentService.getDocuments(this.targetRepository(), 1, initialTargetType).pipe(
        catchError((error: { status?: number; message?: string }) => {
          this.targetRequestError.set({ status: error.status, message: error.message });
          return of(this.emptyPaginatedDocuments());
        }),
      ),
      sourceTypes: this.documentService.getTypes(this.sourceRepository()).pipe(
        catchError((error: { status?: number; message?: string }) => {
          this.sourceRequestError.set({ status: error.status, message: error.message });
          return of({} as Record<string, string>);
        }),
      ),
      targetTypes: this.documentService.getTypes(this.targetRepository()).pipe(
        catchError((error: { status?: number; message?: string }) => {
          this.targetRequestError.set({ status: error.status, message: error.message });
          return of({} as Record<string, string>);
        }),
      ),
    })
      .pipe(finalize(() => this.initialLoading.set(false)))
      .subscribe(
      ({
        source,
        target,
        sourceTypes,
        targetTypes,
      }: {
        source: PaginatedDocuments;
        target: PaginatedDocuments;
        sourceTypes: Record<string, string>;
        targetTypes: Record<string, string>;
      }) => {
        this.applySourceResult(source);
        this.applyTargetResult(target);

        this.sourceTypes.set(Object.entries(sourceTypes).map(([id, label]) => ({ id, label })));
        this.targetTypes.set(Object.entries(targetTypes).map(([id, label]) => ({ id, label })));
      },
    );
  }

  onSourceSearch(search: string): void {
    this.sourceSearch.set(search);
    this.updateQueryParams();
    this.sourceRequestError.set(null);
    this.sourceDocuments.set([]);
    this.sourcePage.set(1);
    this.sourceLoading.set(true);
    this.documentService
      .getDocuments(this.sourceRepository(), 1, search)
      .subscribe({
        next: (result: PaginatedDocuments) => {
          this.applySourceResult(result);
          this.sourceLoading.set(false);
        },
        error: (error: { status?: number; message?: string }) => {
          this.sourceRequestError.set({ status: error.status, message: error.message });
          this.sourceLoading.set(false);
        },
      });
  }

  onTargetSearch(search: string): void {
    this.targetSearch.set(search);
    this.updateQueryParams();
    this.targetRequestError.set(null);
    this.targetDocuments.set([]);
    this.targetPage.set(1);
    this.targetLoading.set(true);
    this.documentService
      .getDocuments(this.targetRepository(), 1, search)
      .subscribe({
        next: (result: PaginatedDocuments) => {
          this.applyTargetResult(result);
          this.targetLoading.set(false);
        },
        error: (error: { status?: number; message?: string }) => {
          this.targetRequestError.set({ status: error.status, message: error.message });
          this.targetLoading.set(false);
        },
      });
  }

  loadSourcePage(page: number): void {
    if (this.sourceLoading()) return;
    this.sourceRequestError.set(null);
    this.sourceLoading.set(true);
    this.documentService
      .getDocuments(this.sourceRepository(),page, this.sourceSearch())
      .subscribe({
        next: (result: PaginatedDocuments) => {
          this.sourceDocuments.update((docs) => [...docs, ...result.documents]);
          this.sourcePage.set(result.page);
          this.sourceTotalPages.set(result.totalPages);
          this.sourceTotalDocuments.set(result.totalDocuments);
          this.sourceLoading.set(false);
        },
        error: (error: { status?: number; message?: string }) => {
          this.sourceRequestError.set({ status: error.status, message: error.message });
          this.sourceLoading.set(false);
        },
      });
  }

  loadTargetPage(page: number): void {
    if (this.targetLoading()) return;
    this.targetRequestError.set(null);
    this.targetLoading.set(true);
    this.documentService
      .getDocuments(this.targetRepository(),page, this.targetSearch())
      .subscribe({
        next: (result: PaginatedDocuments) => {
          this.targetDocuments.update((docs) => [...docs, ...result.documents]);
          this.targetPage.set(result.page);
          this.targetTotalPages.set(result.totalPages);
          this.targetTotalDocuments.set(result.totalDocuments);
          this.targetLoading.set(false);
        },
        error: (error: { status?: number; message?: string }) => {
          this.targetRequestError.set({ status: error.status, message: error.message });
          this.targetLoading.set(false);
        },
      });
  }

  refreshSource(): void {
    this.sourceRequestError.set(null);
    this.sourceDocuments.set([]);
    this.sourceLoading.set(true);
    this.documentService
      .getDocuments(this.sourceRepository(),1, this.sourceSearch())
      .subscribe({
        next: (result: PaginatedDocuments) => {
          this.applySourceResult(result);
          this.sourceLoading.set(false);
        },
        error: (error: { status?: number; message?: string }) => {
          this.sourceRequestError.set({ status: error.status, message: error.message });
          this.sourceLoading.set(false);
        },
      });
  }

  refreshTarget(): void {
    this.targetRequestError.set(null);
    this.targetDocuments.set([]);
    this.targetLoading.set(true);
    this.documentService
      .getDocuments(this.targetRepository(),1, this.targetSearch())
      .subscribe({
        next: (result: PaginatedDocuments) => {
          this.applyTargetResult(result);
          this.targetLoading.set(false);
        },
        error: (error: { status?: number; message?: string }) => {
          this.targetRequestError.set({ status: error.status, message: error.message });
          this.targetLoading.set(false);
        },
      });
  }

  private emptyPaginatedDocuments(): PaginatedDocuments {
    return {
      documents: [],
      page: 1,
      totalPages: 1,
      totalDocuments: 0,
    };
  }

  private applySourceResult(result: PaginatedDocuments): void {
    this.sourceDocuments.set(result.documents);
    this.sourcePage.set(result.page);
    this.sourceTotalPages.set(result.totalPages);
    this.sourceTotalDocuments.set(result.totalDocuments);
  }

  private applyTargetResult(result: PaginatedDocuments): void {
    this.targetDocuments.set(result.documents);
    this.targetPage.set(result.page);
    this.targetTotalPages.set(result.totalPages);
    this.targetTotalDocuments.set(result.totalDocuments);
  }

  private updateQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        sourceType: this.sourceSearch() || null,
        targetType: this.targetSearch() || null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
