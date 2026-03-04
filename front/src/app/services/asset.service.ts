import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AssetFile {
  id: string;
  url: string;
  filename: string;
  kind: string;
}

export interface MigrationResult {
  success: boolean;
  assetId?: string;
  filename?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AssetService {
  private readonly apiUrl = 'http://localhost:3001';

  constructor(private readonly http: HttpClient) {}

  getSourceAssets(): Observable<AssetFile[]> {
    return this.http.get<AssetFile[]>(`${this.apiUrl}/assets/source`);
  }

  getTargetAssets(): Observable<AssetFile[]> {
    return this.http.get<AssetFile[]>(`${this.apiUrl}/assets/target`);
  }

  migrateAsset(sourceUrl: string, filename?: string): Observable<MigrationResult> {
    return this.http.post<MigrationResult>(`${this.apiUrl}/assets/migrate`, { sourceUrl, filename });
  }
}

