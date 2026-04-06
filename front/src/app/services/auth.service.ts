import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { User, UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { OidcClaims, OidcConfig } from '@shared/types';
import { API_BASE_URL } from '../app.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_BASE_URL);

  private manager: UserManager | null = null;
  private accessToken: string | null = null;
  private oidcEnabled = false;
  private loginRedirectInProgress = false;

  readonly claims = signal<OidcClaims | null>(null);
  readonly isAuthenticated = signal<boolean>(false);

  async initialize(): Promise<void> {
    try {
      const config = await firstValueFrom(this.http.get<OidcConfig>(`${this.apiUrl}/auth/config`));

      // OIDC not configured -> no auth required
      if (!config.issuer || !config.clientId) {
        console.info('[Auth] OIDC non configuré — authentification désactivée.');
        this.isAuthenticated.set(true);
        return;
      }

      this.oidcEnabled = true;

      this.manager = new UserManager({
        authority: config.issuer,
        client_id: config.clientId,
        redirect_uri: globalThis.location.origin,
        scope: config.scope,
        userStore: new WebStorageStateStore({ store: sessionStorage }),
      });

      // Return from the IdP
      if (new URLSearchParams(globalThis.location.search).has('code')) {
        const user = await this.manager.signinRedirectCallback();
        // Restore the original URL saved in the OIDC state
        const redirect = (user.state as { redirect?: string } | null)?.redirect;
        const target = new URL(redirect ?? '/', globalThis.location.origin);
        target.search = '';
        globalThis.history.replaceState({}, '', target.toString());
        this.loginRedirectInProgress = false;
        this.applyUser(user);
        return;
      }

      // Existing session in sessionStorage
      const user = await this.manager.getUser();
      if (user && !user.expired) {
        this.applyUser(user);
      }
    } catch (err) {
      console.error("[Auth] Erreur d'initialisation OIDC :", err);
    }
  }

  login(): void {
    if (!this.oidcEnabled || !this.manager || this.loginRedirectInProgress) {
      return;
    }

    this.loginRedirectInProgress = true;
    void this.manager
      .signinRedirect({
        state: { redirect: globalThis.location.href },
      })
      .catch((err) => {
        this.loginRedirectInProgress = false;
        console.error('[Auth] Erreur lors de la redirection vers le login :', err);
      });
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  handleUnauthorized(): void {
    if (!this.oidcEnabled) {
      return;
    }

    this.clearLocalAuthState();

    if (!this.loginRedirectInProgress) {
      this.login();
    }
  }

  logout(): void {
    this.clearLocalAuthState();
    this.manager?.signoutRedirect({
      post_logout_redirect_uri: globalThis.location.origin,
    });
  }

  private clearLocalAuthState(): void {
    this.accessToken = null;
    this.claims.set(null);
    this.isAuthenticated.set(false);
    void this.manager?.removeUser().catch((err) => {
      console.error('[Auth] Erreur lors du nettoyage de la session locale :', err);
    });
  }

  private applyUser(user: User): void {
    this.accessToken = user.access_token;
    this.claims.set(user.profile as unknown as OidcClaims);
    this.isAuthenticated.set(true);
  }
}
