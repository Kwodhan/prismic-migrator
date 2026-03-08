import { Component, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import {TargetDocumentList} from '../target-document-list/target-document-list';
import {SourceDocumentList} from '../source-document-list/source-document-list';
import {DocumentService} from '../../../services/document.service';
import {ConfigService, RepositoryConfig} from '../../../services/config.service';
import { DocumentType } from '../document-list/document-list';
import {PaginatedDocuments, PrismicDocument} from '@shared/types';

@Component({
  selector: 'document-migration',
  imports: [SourceDocumentList, TargetDocumentList, MatProgressBarModule, MatIconModule],
  templateUrl: './document-migration.html',
  styleUrl: './document-migration.css',
})
export class DocumentMigration implements OnInit {
  private readonly documentService = inject(DocumentService);
  private readonly configService = inject(ConfigService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

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

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const initialSourceType = params.get('sourceType') ?? '';
    const initialTargetType = params.get('targetType') ?? '';

    this.sourceSearch.set(initialSourceType);
    this.targetSearch.set(initialTargetType);

    forkJoin({
      source: this.documentService.getSourceDocuments(1, initialSourceType),
      target: this.documentService.getTargetDocuments(1, initialTargetType),
      config: this.configService.getConfig(),
      sourceTypes: this.documentService.getSourceTypes(),
      targetTypes: this.documentService.getTargetTypes(),
    }).subscribe(({ source, target, config, sourceTypes, targetTypes }: {
      source: PaginatedDocuments;
      target: PaginatedDocuments;
      config: RepositoryConfig;
      sourceTypes: Record<string, string>;
      targetTypes: Record<string, string>;
    }) => {
      this.sourceDocuments.set(source.documents);
      this.sourcePage.set(source.page);
      this.sourceTotalPages.set(source.totalPages);
      this.sourceTotalDocuments.set(source.totalDocuments);

      this.targetDocuments.set(target.documents);
      this.targetPage.set(target.page);
      this.targetTotalPages.set(target.totalPages);
      this.targetTotalDocuments.set(target.totalDocuments);

      this.sourceRepository.set(config.sourceRepository);
      this.targetRepository.set(config.destinationRepository);

      this.sourceTypes.set(Object.entries(sourceTypes).map(([id, label]) => ({ id, label })));
      this.targetTypes.set(Object.entries(targetTypes).map(([id, label]) => ({ id, label })));

      this.initialLoading.set(false);
    });
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

  onSourceSearch(search: string): void {
    this.sourceSearch.set(search);
    this.updateQueryParams();
    this.sourceDocuments.set([]);
    this.sourcePage.set(1);
    this.sourceLoading.set(true);
    this.documentService.getSourceDocuments(1, search).subscribe((result: PaginatedDocuments) => {
      this.sourceDocuments.set(result.documents);
      this.sourcePage.set(result.page);
      this.sourceTotalPages.set(result.totalPages);
      this.sourceTotalDocuments.set(result.totalDocuments);
      this.sourceLoading.set(false);
    });
  }

  onTargetSearch(search: string): void {
    this.targetSearch.set(search);
    this.updateQueryParams();
    this.targetDocuments.set([]);
    this.targetPage.set(1);
    this.targetLoading.set(true);
    this.documentService.getTargetDocuments(1, search).subscribe((result: PaginatedDocuments) => {
      this.targetDocuments.set(result.documents);
      this.targetPage.set(result.page);
      this.targetTotalPages.set(result.totalPages);
      this.targetTotalDocuments.set(result.totalDocuments);
      this.targetLoading.set(false);
    });
  }

  loadSourcePage(page: number): void {
    if (this.sourceLoading()) return;
    this.sourceLoading.set(true);
    this.documentService.getSourceDocuments(page, this.sourceSearch()).subscribe((result: PaginatedDocuments) => {
      this.sourceDocuments.update(docs => [...docs, ...result.documents]);
      this.sourcePage.set(result.page);
      this.sourceTotalPages.set(result.totalPages);
      this.sourceTotalDocuments.set(result.totalDocuments);
      this.sourceLoading.set(false);
    });
  }

  loadTargetPage(page: number): void {
    if (this.targetLoading()) return;
    this.targetLoading.set(true);
    this.documentService.getTargetDocuments(page, this.targetSearch()).subscribe((result: PaginatedDocuments) => {
      this.targetDocuments.update(docs => [...docs, ...result.documents]);
      this.targetPage.set(result.page);
      this.targetTotalPages.set(result.totalPages);
      this.targetTotalDocuments.set(result.totalDocuments);
      this.targetLoading.set(false);
    });
  }

  refreshSource(): void {
    this.sourceDocuments.set([]);
    this.documentService.getSourceDocuments(1, this.sourceSearch()).subscribe((result: PaginatedDocuments) => {
      this.sourceDocuments.set(result.documents);
      this.sourcePage.set(result.page);
      this.sourceTotalPages.set(result.totalPages);
      this.sourceTotalDocuments.set(result.totalDocuments);
      this.sourceLoading.set(false);
    });
  }

  refreshTarget(): void {
    this.targetDocuments.set([]);
    this.documentService.getTargetDocuments(1, this.targetSearch()).subscribe((result: PaginatedDocuments) => {
      this.targetDocuments.set(result.documents);
      this.targetPage.set(result.page);
      this.targetTotalPages.set(result.totalPages);
      this.targetTotalDocuments.set(result.totalDocuments);
      this.targetLoading.set(false);
    });
  }
}
