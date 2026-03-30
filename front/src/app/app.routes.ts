import { Routes } from '@angular/router';
import { migrationGuard } from './migration.guard';
import { authGuard } from './guards/auth.guard';
import { EnvironmentPage } from './pages/environment/environment-page.component';

export const routes: Routes = [
  { path: '', component: EnvironmentPage, title: 'Home', canActivate: [authGuard] },
  {
    path: 'custom-type',
    loadComponent: () =>
      import('./pages/custom-type/custom-type-page.component').then((m) => m.CustomTypePage),
    title: 'Custom Type',
    canActivate: [authGuard, migrationGuard],
  },
  {
    path: 'asset',
    loadComponent: () => import('./pages/asset/asset-page.component').then((m) => m.AssetPage),
    title: 'Assets',
    canActivate: [authGuard, migrationGuard],
  },
  {
    path: 'document',
    loadComponent: () =>
      import('./pages/document/document-page.component').then((m) => m.DocumentPage),
    title: 'Document',
    canActivate: [authGuard, migrationGuard],
  },
];
