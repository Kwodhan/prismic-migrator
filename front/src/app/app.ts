import { Component } from '@angular/core';
import { AssetMigration } from './components/asset-migration/asset-migration';

@Component({
  selector: 'app-root',
  imports: [AssetMigration],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
