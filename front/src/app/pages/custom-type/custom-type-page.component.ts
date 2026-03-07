import { Component } from '@angular/core';
import { CustomTypeMigration } from '../../components/custom-type/custom-type-migration/custom-type-migration';

@Component({
  selector: 'app-custom-type-page',
  imports: [CustomTypeMigration],
  templateUrl: './custom-type-page.component.html',
  styleUrl: './custom-type-page.component.css',
})
export class CustomTypePage {}
