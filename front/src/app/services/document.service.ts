import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map, Observable} from 'rxjs';
import { API_URL } from '../constants/api';
import {DocumentMigrationResult, PaginatedDocuments, ReportMigrationResult} from '@shared/types';

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

  getReportMigrateDocument(id: string): Observable<ReportMigrationResult> {
    return this.http.get<DocumentMigrationResult>(`${this.apiUrl}/documents/${id}/migrate`, {});
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
