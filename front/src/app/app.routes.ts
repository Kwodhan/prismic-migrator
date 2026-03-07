import { Routes } from '@angular/router';
import { CustomBuilderPage } from './pages/custom-builder/custom-builder-page.component';
import { AssetPage } from './pages/asset/asset-page.component';
import { DocumentPage } from './pages/document/document-page.component';

export const routes: Routes = [
  { path: '', redirectTo: 'custom-builder', pathMatch: 'full' },
  { path: 'custom-builder', component: CustomBuilderPage },
  { path: 'asset', component: AssetPage },
  { path: 'document', component: DocumentPage },
];
