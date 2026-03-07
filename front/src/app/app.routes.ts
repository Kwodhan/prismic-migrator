import { Routes } from '@angular/router';
import { CustomTypePage } from './pages/custom-type/custom-type-page.component';
import { AssetPage } from './pages/asset/asset-page.component';
import { DocumentPage } from './pages/document/document-page.component';

export const routes: Routes = [
  { path: '', redirectTo: 'custom-type', pathMatch: 'full' },
  { path: 'custom-type', component: CustomTypePage },
  { path: 'asset', component: AssetPage },
  { path: 'document', component: DocumentPage },
];
