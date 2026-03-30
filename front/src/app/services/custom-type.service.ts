import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CustomType, CustomTypeMigrationResult } from '@shared/types';
import { API_BASE_URL } from '../app.config';

@Injectable({
  providedIn: 'root',
})
export class CustomTypeService {
  private readonly apiUrl = inject(API_BASE_URL);

  constructor(private readonly http: HttpClient) {}

  getCustomTypes(repoName: string): Observable<CustomType[]> {
    return this.http.get<CustomType[]>(`${this.apiUrl}/custom-types/${repoName}`);
  }

  migrateCustomType(
    repoNameSource: string,
    repoNameTarget: string,
    idSource: string,
  ): Observable<CustomTypeMigrationResult> {
    return this.http.post<CustomTypeMigrationResult>(`${this.apiUrl}/custom-types/migrate`, {
      repoNameSource,
      repoNameTarget,
      idSource,
    });
  }

  updateCustomType(
    repoNameSource: string,
    repoNameTarget: string,
    idSource: string,
  ): Observable<CustomTypeMigrationResult> {
    return this.http.put<CustomTypeMigrationResult>(`${this.apiUrl}/custom-types/update`, {
      repoNameSource,
      repoNameTarget,
      idSource,
    });
  }
}
