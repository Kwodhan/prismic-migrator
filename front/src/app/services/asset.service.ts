import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AssetFile, AssetMigrationResult } from '@shared/types';
import { API_BASE_URL } from '../app.config';

@Injectable({
  providedIn: 'root',
})
export class AssetService {
  private readonly apiUrl = inject(API_BASE_URL);

  constructor(private readonly http: HttpClient) {}

  getAssets(repoName: string): Observable<AssetFile[]> {
    return this.http.get<AssetFile[]>(`${this.apiUrl}/assets/${repoName}`);
  }

  migrateAsset(
    sourceUrl: string,
    repoNameTarget: string,
    filename?: string,
  ): Observable<AssetMigrationResult> {
    return this.http.post<AssetMigrationResult>(`${this.apiUrl}/assets/migrate`, {
      sourceUrl,
      repoNameTarget,
      filename,
    });
  }
}
