import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { User, UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { OidcClaims, OidcConfig } from '@shared/types';
import { TokenStoreService } from './token-store.service';
import { API_BASE_URL } from '../app.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenStore = inject(TokenStoreService);
  private readonly apiUrl = inject(API_BASE_URL);

  private manager: UserManager | null = null;

  readonly claims = signal<OidcClaims | null>(null);
  readonly isAuthenticated = signal<boolean>(false);

  async initialize(): Promise<void> {
    try {
      const config = await firstValueFrom(this.http.get<OidcConfig>(`${this.apiUrl}/auth/config`));

      // OIDC non configuré → pas d'auth requise
      if (!config.issuer || !config.clientId) {
        console.info('[Auth] OIDC non configuré — authentification désactivée.');
        this.isAuthenticated.set(true);
        return;
      }

      this.manager = new UserManager({
        authority: config.issuer,
        client_id: config.clientId,
        redirect_uri: window.location.origin,
        scope: config.scope,
        userStore: new WebStorageStateStore({ store: sessionStorage }),
      });

      // Retour depuis l'IdP (code dans l'URL)
      if (new URLSearchParams(window.location.search).has('code')) {
        const user = await this.manager.signinRedirectCallback();
        // Restaure l'URL d'origine sauvegardée dans le state OIDC
        const redirect = (user.state as { redirect?: string } | null)?.redirect;
        const target = new URL(redirect ?? '/', window.location.origin);
        target.search = '';
        window.history.replaceState({}, '', target.toString());
        this.applyUser(user);
        return;
      }

      // Session existante en sessionStorage
      const user = await this.manager.getUser();
      if (user && !user.expired) {
        this.applyUser(user);
      }
    } catch (err) {
      console.error("[Auth] Erreur d'initialisation OIDC :", err);
    }
  }

  login(): void {
    this.manager?.signinRedirect({
      state: { redirect: window.location.href },
    });
  }

  logout(): void {
    this.tokenStore.clearToken();
    this.claims.set(null);
    this.isAuthenticated.set(false);
    this.manager?.signoutRedirect({
      post_logout_redirect_uri: window.location.origin,
    });
  }

  private applyUser(user: User): void {
    this.tokenStore.setToken(user.access_token);
    this.claims.set(user.profile as unknown as OidcClaims);
    this.isAuthenticated.set(true);
  }
}
