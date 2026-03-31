import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { API_BASE_URL } from '../app.config';

function isApiRequest(requestUrl: string, apiBaseUrl: string): boolean {
  const normalizedApiBase = apiBaseUrl.replace(/\/$/, '');

  if (normalizedApiBase.startsWith('/')) {
    return requestUrl.startsWith(normalizedApiBase + '/') || requestUrl === normalizedApiBase;
  }

  return requestUrl.startsWith(normalizedApiBase + '/') || requestUrl === normalizedApiBase;
}

/**
 * Adds the OIDC Bearer token to every outgoing HTTP request.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const apiBaseUrl = inject(API_BASE_URL);
  const token = auth.getAccessToken();
  const shouldAttachToken = !!token && isApiRequest(req.url, apiBaseUrl);
  const authenticatedReq = shouldAttachToken
    ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
    : req;

  return next(authenticatedReq).pipe(
    catchError((error) => {
      if (error.status === 401) {
        auth.handleUnauthorized();
      }

      return throwError(() => error);
    })
  );
};

