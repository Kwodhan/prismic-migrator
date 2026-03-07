import { computed, Directive, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { PrismicDocument } from '../../../services/document.service';

export interface DocumentType {
  id: string;
  label: string;
}

@Directive()
export class DocumentList {
  documents = input<PrismicDocument[]>([]);
  totalPages = input<number>(1);
  currentPage = input<number>(1);
  loading = input<boolean>(false);
  types = input<DocumentType[]>([]);
  repository = input<string>('');
  initialType = input<string>('');

  readonly refreshNeeded = output<void>();
  readonly pageNeeded = output<number>();
  readonly searchChanged = output<string>();

  readonly filterType = signal('');
  protected observer: IntersectionObserver | null = null;
  readonly sentinel = viewChild<ElementRef>('sentinel');

  readonly filteredTypes = computed(() => {
    const search = this.filterType().toLowerCase().trim();
    if (!search) return this.types();
    return this.types().filter(t =>
      t.id.toLowerCase().includes(search) || t.label.toLowerCase().includes(search)
    );
  });

  readonly hasMore = () => this.currentPage() < this.totalPages();

  onTypeSelected(typeId: string): void {
    this.filterType.set(typeId);
    this.searchChanged.emit(typeId);
  }

  onTypeCleared(): void {
    this.filterType.set('');
    this.searchChanged.emit('');
  }

  constructor() {
    effect(() => {
      const initial = this.initialType();
      if (initial) this.filterType.set(initial);
    });

    effect(() => {
      const sentinel = this.sentinel();
      if (!sentinel) return;

      this.observer?.disconnect();

      if (this.hasMore()) {
        this.observer = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting) {
            this.pageNeeded.emit(this.currentPage() + 1);
          }
        }, { threshold: 0.1 });

        this.observer.observe(sentinel.nativeElement);
      }
    });
  }
}
