import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map, Observable} from 'rxjs';
import { API_URL } from '../constants/api';

export interface PrismicDocument {
  id: string;
  uid: string | null;
  type: string;
  url: string | null;
  first_publication_date: string | null;
  last_publication_date: string | null;
}

export interface PaginatedDocuments {
  documents: PrismicDocument[];
  page: number;
  totalPages: number;
  totalDocuments: number;
}

export type ValidationSeverity = 'BLOCKING' | 'WARNING';

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  validator: string;
  message: string;
  fixable: boolean;
  fixed?: boolean;
  fixDescription?: string;
  context?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface DocumentMigrationResult {
  success: boolean;
  id?: string;
  error?: string;
  validation?: ValidationResult;
}

interface CustomType { id: string; label: string; }

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private readonly apiUrl = API_URL;

  constructor(private readonly http: HttpClient) {
  }

  getSourceTypes(): Observable<Record<string, string>> {
    return this.http.get<CustomType[]>(`${this.apiUrl}/custom-types/source`).pipe(
      map(types => Object.fromEntries(types.map(t => [t.id, t.label])))
    );
  }

  getTargetTypes(): Observable<Record<string, string>> {
    return this.http.get<CustomType[]>(`${this.apiUrl}/custom-types/target`).pipe(
      map(types => Object.fromEntries(types.map(t => [t.id, t.label])))
    );
  }

  migrateDocument(id: string): Observable<DocumentMigrationResult> {
    return this.http.post<DocumentMigrationResult>(`${this.apiUrl}/documents/${id}/migrate`, {});
  }

  getSourceDocuments(page = 1, type = ''): Observable<PaginatedDocuments> {
    const params: Record<string, string | number> = { page };
    if (type) params['type'] = type;
    return this.http.get<PaginatedDocuments>(`${this.apiUrl}/documents/source`, { params });
  }

  getTargetDocuments(page = 1, type = ''): Observable<PaginatedDocuments> {
    const params: Record<string, string | number> = { page };
    if (type) params['type'] = type;
    return this.http.get<PaginatedDocuments>(`${this.apiUrl}/documents/target`, { params });
  }
}
