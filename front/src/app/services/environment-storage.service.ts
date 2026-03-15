import { Injectable } from '@angular/core';

export const STORAGE_KEY_SOURCE = 'migration_source_env';
export const STORAGE_KEY_TARGET = 'migration_target_env';

@Injectable({ providedIn: 'root' })
export class EnvironmentStorageService {
  getRepoNameSource(): string | null {
    return localStorage.getItem(STORAGE_KEY_SOURCE);
  }

  getRepoNameTarget(): string | null {
    return localStorage.getItem(STORAGE_KEY_TARGET);
  }
}
