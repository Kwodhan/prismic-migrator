import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CustomTypeList } from '../custom-type-list/custom-type-list';

@Component({
  selector: 'target-custom-type-list',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './target-custom-type-list.html',
  styleUrl: './target-custom-type-list.css',
})
export class TargetCustomTypeList extends CustomTypeList {}

