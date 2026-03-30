import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { Environment } from '@shared/types';
import { API_BASE_URL } from '../app.config';

@Injectable({
  providedIn: 'root',
})
export class EnvironmentService {
  private readonly apiUrl = inject(API_BASE_URL);
  private readonly config$: Observable<Environment[]>;

  constructor(private readonly http: HttpClient) {
    this.config$ = this.http.get<Environment[]>(`${this.apiUrl}/config`).pipe(shareReplay(1));
  }

  getEnvironments(): Observable<Environment[]> {
    return this.config$;
  }
}
