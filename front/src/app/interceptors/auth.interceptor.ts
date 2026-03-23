import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStoreService } from '../services/token-store.service';

/**
 * Ajoute le Bearer token OIDC à chaque requête HTTP sortante.
 * Utilise TokenStoreService (sans HttpClient) pour éviter toute
 * dépendance circulaire avec AuthService.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStore = inject(TokenStoreService);
  const token = tokenStore.getToken();

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
  );
};

