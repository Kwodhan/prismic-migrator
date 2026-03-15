import { Component } from '@angular/core';
import { EnvironmentSelector } from '../../components/environment-selector/environment-selector.component';

@Component({
  selector: 'app-environment-page',
  imports: [EnvironmentSelector],
  templateUrl: './environment-page.component.html',
  styleUrl: './environment-page.component.css',
})
export class EnvironmentPage {}
