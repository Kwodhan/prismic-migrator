import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { API_URL } from '../constants/api';
import { Environnement } from '@shared/types';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private readonly apiUrl = API_URL;
  private readonly config$: Observable<Environnement[]>;

  constructor(private readonly http: HttpClient) {
    this.config$ = this.http.get<Environnement[]>(`${this.apiUrl}/config`).pipe(shareReplay(1));
  }

  getConfig(): Observable<Environnement[]> {
    return this.config$;
  }
}
