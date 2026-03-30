import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { AppTitleStrategy } from './app-title.strategy';
import { authInterceptor } from './interceptors/auth.interceptor';
import { AuthService } from './services/auth.service';
import { InjectionToken } from '@angular/core';

export function resolveApiBaseUrl(): string {
  return typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? '/api'
    : 'http://localhost:3001/api';
}

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');


export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: API_BASE_URL, useFactory: resolveApiBaseUrl },
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    provideAppInitializer(() => inject(AuthService).initialize()),
  ]
};
