import {
  computed,
  Directive,
  effect,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { PrismicDocument } from '@shared/types';

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
  repository = input.required<string>();
  initialType = input<string>('');
  requestError = input<{ status?: number; message?: string } | null>(null);

  readonly hasRequestError = computed(() => this.requestError() !== null);
  readonly requestErrorMessage = computed(() => {
    const error = this.requestError();
    if (!error) {
      return '';
    }

    if (error.status === 403) {
      return 'Access denied for this repository.';
    }

    if (error.status) {
      return `Failed to load data (HTTP ${error.status}).`;
    }

    return error.message ?? 'Failed to load data.';
  });

  readonly refreshNeeded = output<void>();
  readonly pageNeeded = output<number>();
  readonly searchChanged = output<string>();

  readonly filterType = signal('');
  readonly sentinel = viewChild<ElementRef>('sentinel');
  readonly filteredTypes = computed(() => {
    const search = this.filterType().toLowerCase().trim();
    if (!search) return this.types();
    return this.types().filter(
      (t) => t.id.toLowerCase().includes(search) || t.label.toLowerCase().includes(search),
    );
  });
  protected observer: IntersectionObserver | null = null;

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
        this.observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              this.pageNeeded.emit(this.currentPage() + 1);
            }
          },
          { threshold: 0.1 },
        );

        this.observer.observe(sentinel.nativeElement);
      }
    });
  }

  readonly hasMore = () => this.currentPage() < this.totalPages();

  onTypeSelected(typeId: string): void {
    this.filterType.set(typeId);
    this.searchChanged.emit(typeId);
  }

  onTypeCleared(): void {
    this.filterType.set('');
    this.searchChanged.emit('');
  }
}
