import { Injectable } from '@angular/core';

const SESSION_KEY = 'oidc_access_token';

/**
 * Minimal OIDC token storage (sessionStorage).
 */
@Injectable({ providedIn: 'root' })
export class TokenStoreService {
  private _token: string | null = null;

  getToken(): string | null {
    return this._token ?? sessionStorage.getItem(SESSION_KEY);
  }

  setToken(token: string): void {
    this._token = token;
    sessionStorage.setItem(SESSION_KEY, token);
  }

  clearToken(): void {
    this._token = null;
    sessionStorage.removeItem(SESSION_KEY);
  }
}

