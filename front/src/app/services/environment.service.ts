import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { API_URL } from '../constants/api';
import { Environment } from '@shared/types';

@Injectable({
  providedIn: 'root',
})
export class EnvironmentService {
  private readonly apiUrl = API_URL;
  private readonly config$: Observable<Environment[]>;

  constructor(private readonly http: HttpClient) {
    this.config$ = this.http.get<Environment[]>(`${this.apiUrl}/config`).pipe(shareReplay(1));
  }

  getEnvironments(): Observable<Environment[]> {
    return this.config$;
  }
}
