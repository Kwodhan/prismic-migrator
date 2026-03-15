import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { DocumentList } from '../document-list/document-list';
import {PrismicDocument} from '@shared/types';

@Component({
  selector: 'source-document-list',
  imports: [FormsModule, DatePipe, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatTooltipModule, MatProgressBarModule, MatAutocompleteModule],
  templateUrl: './source-document-list.html',
  styleUrl: './source-document-list.css',
})
export class SourceDocumentList extends DocumentList {
  onDragStart(event: DragEvent, doc: PrismicDocument): void {
    event.dataTransfer?.setData(
      'application/json',
      JSON.stringify({ repositorySource: this.repository(), document: doc }),
    );
  }
}
