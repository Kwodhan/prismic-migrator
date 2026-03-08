import { Component, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomTypeService } from '../../../services/custom-type.service';
import { ConfigService } from '../../../services/config.service';
import { SourceCustomTypeList } from '../source-custom-type-list/source-custom-type-list';
import { TargetCustomTypeList } from '../target-custom-type-list/target-custom-type-list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import {CustomType} from '@shared/types';

@Component({
  selector: 'custom-type-migration',
  imports: [SourceCustomTypeList, TargetCustomTypeList, MatProgressBarModule, MatIconModule],
  templateUrl: './custom-type-migration.html',
  styleUrl: './custom-type-migration.css',
})
export class CustomTypeMigration implements OnInit {
  private readonly customTypeService = inject(CustomTypeService);
  private readonly configService = inject(ConfigService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  sourceCustomTypes = signal<CustomType[]>([]);
  targetCustomTypes = signal<CustomType[]>([]);
  loading = signal(true);
  sourceRepository = signal('');
  targetRepository = signal('');
  sourceFilter = signal('');
  targetFilter = signal('');

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.sourceFilter.set(params.get('sourceFilter') ?? '');
    this.targetFilter.set(params.get('targetFilter') ?? '');

    forkJoin({
      source: this.customTypeService.getSourceCustomTypes(),
      target: this.customTypeService.getTargetCustomTypes(),
      config: this.configService.getConfig(),
    }).subscribe(({ source, target, config }) => {
      this.sourceCustomTypes.set(source);
      this.targetCustomTypes.set(target);
      this.sourceRepository.set(config.sourceRepository);
      this.targetRepository.set(config.destinationRepository);
      this.loading.set(false);
    });
  }

  onSourceFilterChange(filter: string): void {
    this.sourceFilter.set(filter);
    this.updateQueryParams();
  }

  onTargetFilterChange(filter: string): void {
    this.targetFilter.set(filter);
    this.updateQueryParams();
  }

  private updateQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        sourceFilter: this.sourceFilter() || null,
        targetFilter: this.targetFilter() || null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  loadSourceCustomTypes(): void {
    this.customTypeService.getSourceCustomTypes().subscribe(ct => this.sourceCustomTypes.set(ct));
  }

  loadTargetCustomTypes(): void {
    this.customTypeService.getTargetCustomTypes().subscribe(ct => this.targetCustomTypes.set(ct));
  }
}

