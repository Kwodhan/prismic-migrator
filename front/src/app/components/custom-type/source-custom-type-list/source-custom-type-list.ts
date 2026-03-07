import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CustomTypeList } from '../custom-type-list/custom-type-list';
import { CustomType } from '../../../services/custom-type.service';

@Component({
  selector: 'source-custom-type-list',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './source-custom-type-list.html',
  styleUrl: './source-custom-type-list.css',
})
export class SourceCustomTypeList extends CustomTypeList {
  onDragStart(event: DragEvent, ct: CustomType): void {
    event.dataTransfer?.setData('application/json', JSON.stringify(ct));
  }
}
