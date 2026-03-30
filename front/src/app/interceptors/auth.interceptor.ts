import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStoreService } from '../services/token-store.service';

/**
 * Adds the OIDC Bearer token to every outgoing HTTP request.
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

