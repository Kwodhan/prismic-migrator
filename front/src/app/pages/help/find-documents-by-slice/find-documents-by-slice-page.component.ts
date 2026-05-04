import { Component, inject, OnInit, signal } from '@angular/core';
import { Environment, PaginatedDocuments, PrismicDocument } from '@shared/types';
import { DocumentService } from '../../../services/document.service';
import { DocumentsBySliceResultComponent } from '../../../components/help/documents-by-slice-result/documents-by-slice-result.component';
import { ActivatedRoute, Router } from '@angular/router';
import { EnvironmentService } from '../../../services/environment.service';
import { MatAutocomplete, MatAutocompleteTrigger, MatOption } from '@angular/material/autocomplete';
import { MatFormField, MatHint, MatInput, MatLabel, MatPrefix, MatSuffix } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatCard, MatCardContent } from '@angular/material/card';

@Component({
  selector: 'app-find-documents-by-slice-page',
  imports: [
    DocumentsBySliceResultComponent,
    MatAutocomplete,
    MatAutocompleteTrigger,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatLabel,
    MatOption,
    MatPrefix,
    MatSuffix,
    MatTooltip,
    ReactiveFormsModule,
    MatButton,
    MatHint,
    MatProgressSpinner,
    MatCardContent,
    MatCard,
  ],
  templateUrl: './find-documents-by-slice-page.component.html',
  styleUrl: './find-documents-by-slice-page.component.css',
})
export class FindDocumentsBySlicePage implements OnInit {
  documents = signal<PrismicDocument[]>([]);
  currentPage = signal(1);
  totalPages = signal(1);
  loading = signal(false);
  requestError = signal<{ status?: number; message?: string } | null>(null);
  environments = signal<Environment[]>([]);

  private repoJustSelected = false;

  searchForm: FormGroup;

  private readonly documentService = inject(DocumentService);
  private readonly environmentService = inject(EnvironmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  constructor(private readonly fb: FormBuilder) {
    this.searchForm = this.fb.group({
      repoName: [''],
      sliceName: [''],
    });
  }

  ngOnInit(): void {
    this.loadEnvironments();
    this.requestError.set(null);

    const params = this.route.snapshot.queryParamMap;
    const repoName = params.get('repoName') ?? '';
    const sliceName = params.get('sliceName') ?? '';

    this.searchForm.patchValue({ repoName, sliceName });

    if (repoName && sliceName) {
      this.fetchDocuments(repoName, sliceName, 1);
    }
  }

  onRepoNameSelected(repoName: string): void {
    this.repoJustSelected = true;
    this.searchForm.patchValue({ repoName, sliceName: '' });
    this.resetResults();
    setTimeout(() => (this.repoJustSelected = false), 0);
  }

  onRepoNameCleared(): void {
    this.searchForm.reset({ repoName: '', sliceName: '' });
    this.resetResults();
    this.updateQueryParams('', '');
  }

  onSliceNameCleared(): void {
    this.searchForm.patchValue({ sliceName: '' });
    this.resetResults();
  }

  onSearch(): void {
    if (this.repoJustSelected) return;

    const { repoName, sliceName } = this.searchForm.value;
    if (!repoName || !sliceName) return;

    this.fetchDocuments(repoName, sliceName, 1);
  }

  loadMoreDocumentPage(page: number): void {
    const { repoName, sliceName } = this.searchForm.value;
    if (!repoName || !sliceName) return;
    this.fetchDocuments(repoName, sliceName, page, true);
  }

  private fetchDocuments(repoName: string, sliceName: string, page: number, append = false): void {
    if (this.loading()) return;

    this.requestError.set(null);
    this.loading.set(true);
    this.updateQueryParams(repoName, sliceName);

    this.documentService.getDocuments(repoName, page, '', sliceName).subscribe({
      next: (result: PaginatedDocuments) => {
        this.documents.update((docs) =>
          append ? [...docs, ...result.documents] : result.documents,
        );
        this.currentPage.set(result.page);
        this.totalPages.set(result.totalPages);
        this.loading.set(false);
      },
      error: (error: { status?: number; message?: string }) => {
        this.requestError.set({ status: error.status, message: error.message });
        this.loading.set(false);
      },
    });
  }

  private loadEnvironments(): void {
    this.environmentService.getEnvironments().subscribe({
      next: (envs) => this.environments.set(envs),
      error: (error: { status?: number; message?: string }) =>
        this.requestError.set({ status: error.status, message: error.message }),
    });
  }

  private resetResults(): void {
    this.documents.set([]);
    this.currentPage.set(1);
    this.totalPages.set(1);
    this.requestError.set(null);
  }

  private updateQueryParams(repoName: string, sliceName: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        repoName: repoName || null,
        sliceName: sliceName || null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
