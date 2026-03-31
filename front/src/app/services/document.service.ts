import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { DocumentMigrationResult, PaginatedDocuments } from '@shared/types';
import { API_BASE_URL } from '../app.config';

interface CustomType {
  id: string;
  label: string;
}

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private readonly apiUrl = inject(API_BASE_URL);

  constructor(private readonly http: HttpClient) {}

  getTypes(repoName: string): Observable<Record<string, string>> {
    return this.http
      .get<CustomType[]>(`${this.apiUrl}/custom-types/${repoName}`)
      .pipe(map((types) => Object.fromEntries(types.map((t) => [t.id, t.label]))));
  }

  getReportMigrateDocument(
    repoNameSource: string,
    repoNameTarget: string,
    idSource: string,
  ): Observable<DocumentMigrationResult> {
    const params: Record<string, string> = { repoNameSource, repoNameTarget, idSource };
    return this.http.get<DocumentMigrationResult>(`${this.apiUrl}/documents/migrate`, { params });
  }

  migrateDocument(
    repoNameSource: string,
    repoNameTarget: string,
    idSource: string,
  ): Observable<DocumentMigrationResult> {
    return this.http.post<DocumentMigrationResult>(`${this.apiUrl}/documents/migrate`, {
      repoNameSource,
      repoNameTarget,
      idSource,
    });
  }

  getDocuments(repoName: string, page = 1, type = ''): Observable<PaginatedDocuments> {
    const params: Record<string, string | number> = { page };
    if (type) {
      params['type'] = type;
    }
    return this.http.get<PaginatedDocuments>(`${this.apiUrl}/documents/${repoName}`, { params });
  }
}
