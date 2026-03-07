import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CustomType {
  id: string;
  label: string;
  repeatable: boolean;
  json: Record<string, unknown>;
  status: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CustomTypeService {
  private readonly apiUrl = 'http://localhost:3001';

  constructor(private readonly http: HttpClient) {}

  getSourceCustomTypes(): Observable<CustomType[]> {
    return this.http.get<CustomType[]>(`${this.apiUrl}/custom-types/source`);
  }

  getTargetCustomTypes(): Observable<CustomType[]> {
    return this.http.get<CustomType[]>(`${this.apiUrl}/custom-types/target`);
  }
}

