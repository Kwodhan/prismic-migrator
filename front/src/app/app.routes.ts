import { Routes } from '@angular/router';
import { CustomTypePage } from './pages/custom-type/custom-type-page.component';
import { AssetPage } from './pages/asset/asset-page.component';
import { DocumentPage } from './pages/document/document-page.component';
import { migrationGuard } from './migration.guard';
import { authGuard } from './guards/auth.guard';
import { EnvironmentPage } from './pages/environment/environment-page.component';

export const routes: Routes = [
  { path: '', component: EnvironmentPage, title: 'Home', canActivate: [authGuard] },
  {
    path: 'custom-type',
    component: CustomTypePage,
    title: 'Custom Type',
    canActivate: [authGuard, migrationGuard],
  },
  { path: 'asset', component: AssetPage, title: 'Assets', canActivate: [authGuard, migrationGuard] },
  { path: 'document', component: DocumentPage, title: 'Document', canActivate: [authGuard, migrationGuard] },
];
