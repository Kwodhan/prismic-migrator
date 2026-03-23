import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protège toutes les routes : redirige vers l'IdP si non authentifié.
 * Aucune sauvegarde serveur — l'identité vient exclusivement des claims OIDC.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);

  if (auth.isAuthenticated()) {
    return true;
  }

  auth.login();
  return false;
};

