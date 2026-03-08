import {computed, Directive, effect, ElementRef, input, output, signal, viewChild} from '@angular/core';
import {AssetFile} from '@shared/types';

export const PAGE_SIZE = 20;

@Directive()
export class AssetList {
  assets = input<AssetFile[]>([]);
  initialFilter = input<string>('');

  readonly refreshNeeded = output<void>();
  readonly filterChanged = output<string>();

  readonly filter = signal('');
  readonly page = signal(1);
  protected observer: IntersectionObserver | null = null;
  readonly sentinel = viewChild<ElementRef>('sentinel');

  readonly filteredAssets = computed(() => {
    const search = this.filter().toLowerCase().trim();
    if (!search) return this.assets();
    return this.assets().filter(a => a.filename.toLowerCase().includes(search));
  });

  visibleAssets = computed(() => this.filteredAssets().slice(0, this.page() * PAGE_SIZE));
  hasMore = computed(() => this.visibleAssets().length < this.filteredAssets().length);

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
      this.assets();
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
