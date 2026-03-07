import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

export interface RepositoryConfig {
  sourceRepository: string;
  destinationRepository: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly apiUrl = 'http://localhost:3001';
  private readonly config$: Observable<RepositoryConfig>;

  constructor(private readonly http: HttpClient) {
    this.config$ = this.http.get<RepositoryConfig>(`${this.apiUrl}/config`).pipe(shareReplay(1));
  }

  getConfig(): Observable<RepositoryConfig> {
    return this.config$;
  }
}

