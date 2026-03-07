import { Component, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CustomType, CustomTypeService } from '../../../services/custom-type.service';
import { ConfigService } from '../../../services/config.service';
import { SourceCustomTypeList } from '../source-custom-type-list/source-custom-type-list';
import { TargetCustomTypeList } from '../target-custom-type-list/target-custom-type-list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'custom-type-migration',
  imports: [SourceCustomTypeList, TargetCustomTypeList, MatProgressBarModule, MatIconModule],
  templateUrl: './custom-type-migration.html',
  styleUrl: './custom-type-migration.css',
})
export class CustomTypeMigration implements OnInit {
  private readonly customTypeService = inject(CustomTypeService);
  private readonly configService = inject(ConfigService);

  sourceCustomTypes = signal<CustomType[]>([]);
  targetCustomTypes = signal<CustomType[]>([]);
  loading = signal(true);
  sourceRepository = signal('');
  targetRepository = signal('');

  ngOnInit(): void {
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

  loadSourceCustomTypes(): void {
    this.customTypeService.getSourceCustomTypes().subscribe(ct => this.sourceCustomTypes.set(ct));
  }

  loadTargetCustomTypes(): void {
    this.customTypeService.getTargetCustomTypes().subscribe(ct => this.targetCustomTypes.set(ct));
  }
}

