import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../constants/api';
import {AssetFile, AssetMigrationResult} from '@shared/types';


@Injectable({
  providedIn: 'root'
})
export class AssetService {
  private readonly apiUrl = API_URL;

  constructor(private readonly http: HttpClient) {}

  getSourceAssets(): Observable<AssetFile[]> {
    return this.http.get<AssetFile[]>(`${this.apiUrl}/assets/source`);
  }

  getTargetAssets(): Observable<AssetFile[]> {
    return this.http.get<AssetFile[]>(`${this.apiUrl}/assets/target`);
  }

  migrateAsset(sourceUrl: string, filename?: string): Observable<AssetMigrationResult> {
    return this.http.post<AssetMigrationResult>(`${this.apiUrl}/assets/migrate`, { sourceUrl, filename });
  }
}
