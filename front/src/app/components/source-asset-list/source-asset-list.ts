import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AssetFile } from '../../services/asset.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AssetList } from '../asset-list/asset-list';

@Component({
  selector: 'source-asset-list',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './source-asset-list.html',
  styleUrl: './source-asset-list.css',
})
export class SourceAssetList extends AssetList {
  onDragStart(event: DragEvent, asset: AssetFile): void {
    event.dataTransfer?.setData('application/json', JSON.stringify(asset));
  }
}

