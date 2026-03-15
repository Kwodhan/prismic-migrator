import { computed, Directive, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import {CustomType} from '@shared/types';

export const PAGE_SIZE = 20;

@Directive()
export class CustomTypeList {
  customTypes = input<CustomType[]>([]);
  repository = input.required<string>();
  initialFilter = input<string>('');

  readonly refreshNeeded = output<void>();
  readonly filterChanged = output<string>();

  readonly filter = signal('');
  readonly page = signal(1);
  protected observer: IntersectionObserver | null = null;
  readonly sentinel = viewChild<ElementRef>('sentinel');

  readonly filteredCustomTypes = computed(() => {
    const search = this.filter().toLowerCase().trim();
    if (!search) return this.customTypes();
    return this.customTypes().filter(ct => ct.label.toLowerCase().includes(search) || ct.id.toLowerCase().includes(search));
  });

  readonly visibleCustomTypes = computed(() => this.filteredCustomTypes().slice(0, this.page() * PAGE_SIZE));
  readonly hasMore = computed(() => this.visibleCustomTypes().length < this.filteredCustomTypes().length);

  constructor() {
    effect(() => {
      const initial = this.initialFilter();
      if (initial) this.filter.set(initial);
    });

    let firstRun = true;
    effect(() => {
      const value = this.filter();
      if (firstRun) { firstRun = false; return; }
      this.filterChanged.emit(value);
    });

    effect(() => {
      this.customTypes();
      this.filter();
      this.page.set(1);
    });

    effect(() => {
      const sentinel = this.sentinel();
      if (!sentinel) return;

      this.observer?.disconnect();

      if (this.hasMore()) {
        this.observer = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting) {
            this.page.update(p => p + 1);
          }
        }, { threshold: 0.1 });

        this.observer.observe(sentinel.nativeElement);
      }
    });
  }
}

