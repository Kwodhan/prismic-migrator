import { Component, inject, OnInit, signal } from '@angular/core';
import { Environment, DocumentReferenceType, PaginatedDocuments, PrismicDocument } from '@shared/types';
import { DocumentService } from '../../../services/document.service';
import { DocumentsBySliceResultComponent } from '../../../components/help/documents-by-slice-result/documents-by-slice-result.component';
import { EnvironmentService } from '../../../services/environment.service';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-find-documents-by-reference-page',
  imports: [
    DocumentsBySliceResultComponent,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './find-documents-by-reference-page.component.html',
})
export class FindDocumentsByReferencePage implements OnInit {
  documents = signal<PrismicDocument[]>([]);
  loading = signal(false);
  requestError = signal<{ status?: number; message?: string } | null>(null);
  environments = signal<Environment[]>([]);
  repository = signal('');

  searchForm: FormGroup<{
    repoName: FormControl<string>;
    referenceType: FormControl<DocumentReferenceType>;
    reference: FormControl<string>;
  }>;

  private readonly documentService = inject(DocumentService);
  private readonly environmentService = inject(EnvironmentService);

  constructor(formBuilder: FormBuilder) {
    this.searchForm = formBuilder.nonNullable.group({
      repoName: [''],
      referenceType: ['document' as DocumentReferenceType],
      reference: [''],
    });
  }

  ngOnInit(): void {
    this.environmentService.getEnvironments().subscribe({
      next: (environments) => this.environments.set(environments),
      error: (error: { status?: number; message?: string }) =>
        this.requestError.set({ status: error.status, message: error.message }),
    });
  }

  onSearch(): void {
    const { repoName, referenceType, reference } = this.searchForm.getRawValue();
    if (!repoName || !reference || !referenceType || this.loading()) return;

    const normalizedReference = reference.trim();
    if (!normalizedReference) return;

    this.loading.set(true);
    this.requestError.set(null);
    this.documents.set([]);
    this.repository.set(repoName);

    this.documentService
      .findDocumentsByReference(repoName, referenceType, normalizedReference)
      .subscribe({
        next: (result: PaginatedDocuments) => {
          this.documents.set(result.documents);
          this.loading.set(false);
        },
        error: (error: { status?: number; message?: string }) => {
          this.requestError.set({ status: error.status, message: error.message });
          this.loading.set(false);
        },
      });
  }

  clearResults(): void {
    this.documents.set([]);
    this.repository.set('');
    this.requestError.set(null);
  }
}
