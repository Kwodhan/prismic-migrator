import { Component } from '@angular/core';
import { DocumentMigration } from '../../components/document/document-migration/document-migration';

@Component({
  selector: 'app-document-page',
  imports: [DocumentMigration],
  templateUrl: './document-page.component.html',
  styleUrl: './document-page.component.css',
})
export class DocumentPage {}
