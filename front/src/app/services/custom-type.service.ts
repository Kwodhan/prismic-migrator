import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../constants/api';
import {CustomType, CustomTypeMigrationResult} from '@shared/types';


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

  migrateCustomType(id: string): Observable<CustomTypeMigrationResult> {
    return this.http.post<CustomTypeMigrationResult>(`${this.apiUrl}/custom-types/${id}/migrate`, {});
  }

  updateCustomType(id: string): Observable<CustomTypeMigrationResult> {
    return this.http.put<CustomTypeMigrationResult>(`${this.apiUrl}/custom-types/${id}/update`, {});
  }
}
