import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from './services/auth.service';
import { EnvironmentService } from './services/environment.service';
import { Environment } from '@shared/types';

@Component({
  selector: 'app-root',
  imports: [RouterModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly environmentService = inject(EnvironmentService);
  protected readonly environments = signal<Environment[]>([]);

  ngOnInit(): void {
    this.loadEnvironments();
  }

  private loadEnvironments(): void {
    this.environmentService.getEnvironments().subscribe({
      next: (envs) => {
        this.environments.set(envs);
      },
    });
  }
}
