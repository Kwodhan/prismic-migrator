import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { EnvironmentService } from '../../services/environment.service';
import { Environment } from '@shared/types';
import { STORAGE_KEY_SOURCE, STORAGE_KEY_TARGET } from '../../services/environment-storage.service';
import { Router } from '@angular/router';


@Component({
  selector: 'environment-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  templateUrl: './environment-selector.component.html',
})
export class EnvironmentSelector implements OnInit {
  private readonly environmentService = inject(EnvironmentService);
  private readonly router = inject(Router);
  environments = signal<Environment[]>([]);
  selectedSource = signal<Environment | null>(null);
  selectedTarget = signal<Environment | null>(null);
  isLoading = signal(true);

  availableForSource = computed(() =>
    this.environments().filter(
      (env) => env.repoName !== this.selectedTarget()?.repoName
    )
  );

  availableForTarget = computed(() =>
    this.environments().filter(
      (env) => env.repoName !== this.selectedSource()?.repoName
    )
  );

  isReadyToMigrate = computed(
    () => this.selectedSource() !== null && this.selectedTarget() !== null
  );


  ngOnInit(): void {
    this.loadEnvironments();
  }

  private loadEnvironments(): void {
    this.isLoading.set(true);
    this.environmentService.getEnvironments().subscribe({
      next: (envs) => {
        this.environments.set(envs);
        this.restoreFromStorage(envs);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  private restoreFromStorage(envs: Environment[]): void {
    const savedSourceName = localStorage.getItem(STORAGE_KEY_SOURCE);
    const savedTargetName = localStorage.getItem(STORAGE_KEY_TARGET);

    if (savedSourceName) {
      const source = envs.find((e) => e.repoName === savedSourceName) ?? null;
      this.selectedSource.set(source);
    }

    if (savedTargetName) {
      const target = envs.find((e) => e.repoName === savedTargetName) ?? null;
      this.selectedTarget.set(target);
    }
  }

  onSourceChange(repoName: string): void {
    const env = this.environments().find((e) => e.repoName === repoName) ?? null;
    this.selectedSource.set(env);

    if (env) {
      localStorage.setItem(STORAGE_KEY_SOURCE, env.repoName);
    } else {
      localStorage.removeItem(STORAGE_KEY_SOURCE);
    }

    if (env && env.repoName === this.selectedTarget()?.repoName) {
      this.selectedTarget.set(null);
      localStorage.removeItem(STORAGE_KEY_TARGET);
    }
  }

  onTargetChange(repoName: string): void {
    const env = this.environments().find((e) => e.repoName === repoName) ?? null;
    this.selectedTarget.set(env);

    if (env) {
      localStorage.setItem(STORAGE_KEY_TARGET, env.repoName);
    } else {
      localStorage.removeItem(STORAGE_KEY_TARGET);
    }

    if (env && env.repoName === this.selectedSource()?.repoName) {
      this.selectedSource.set(null);
      localStorage.removeItem(STORAGE_KEY_SOURCE);
    }
  }

  swapEnvironments(): void {
    const source = this.selectedSource();
    const target = this.selectedTarget();

    this.selectedSource.set(target);
    this.selectedTarget.set(source);

    if (target) {
      localStorage.setItem(STORAGE_KEY_SOURCE, target.repoName);
    } else {
      localStorage.removeItem(STORAGE_KEY_SOURCE);
    }

    if (source) {
      localStorage.setItem(STORAGE_KEY_TARGET, source.repoName);
    } else {
      localStorage.removeItem(STORAGE_KEY_TARGET);
    }
  }

  resetSelection(): void {
    this.selectedSource.set(null);
    this.selectedTarget.set(null);
    localStorage.removeItem(STORAGE_KEY_SOURCE);
    localStorage.removeItem(STORAGE_KEY_TARGET);
  }

  startMigration(): void {
    this.router.navigate(['/custom-type']);
  }
}
