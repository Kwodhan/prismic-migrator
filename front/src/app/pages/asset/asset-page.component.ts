import { Component } from '@angular/core';
import {AssetMigration} from '../../components/asset/asset-migration/asset-migration';

@Component({
  selector: 'app-asset-page',
  imports: [
    AssetMigration
  ],
  templateUrl: './asset-page.component.html',
  styleUrl: './asset-page.component.css',
})
export class AssetPage {}
