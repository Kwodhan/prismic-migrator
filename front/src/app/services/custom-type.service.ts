import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../constants/api';

export interface CustomType {
  id: string;
  label: string;
  repeatable: boolean;
  json: Record<string, unknown>;
  status: boolean;
}

export interface MigrationResult {
  success: boolean;
  id?: string;
  label?: string;
  target?: CustomType;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomTypeService {
  private readonly apiUrl = API_URL;

  constructor(private readonly http: HttpClient) {}

  getSourceCustomTypes(): Observable<CustomType[]> {
    return this.http.get<CustomType[]>(`${this.apiUrl}/custom-types/source`);
  }

  getTargetCustomTypes(): Observable<CustomType[]> {
    return this.http.get<CustomType[]>(`${this.apiUrl}/custom-types/target`);
  }

  migrateCustomType(id: string): Observable<MigrationResult> {
    return this.http.post<MigrationResult>(`${this.apiUrl}/custom-types/${id}/migrate`, {});
  }

  updateCustomType(id: string): Observable<MigrationResult> {
    return this.http.put<MigrationResult>(`${this.apiUrl}/custom-types/${id}/update`, {});
  }
}

