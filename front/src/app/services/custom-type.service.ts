import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../constants/api';
import { CustomType, CustomTypeMigrationResult } from '@shared/types';

@Injectable({
  providedIn: 'root',
})
export class CustomTypeService {
  private readonly apiUrl = API_URL;

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
