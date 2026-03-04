import { Component, computed, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AssetFile } from '../../services/asset.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-asset-list',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule],
  templateUrl: './asset-list.html',
  styleUrl: './asset-list.css',
})
export class AssetList {
  assets = input<AssetFile[]>([]);
  draggable = input<boolean>(false);
  assetDragStart = output<AssetFile>();

  filter = signal('');

  private readonly page = signal(1);
  private observer: IntersectionObserver | null = null;
  private readonly sentinel = viewChild<ElementRef>('sentinel');

  private readonly filteredAssets = computed(() => {
    const search = this.filter().toLowerCase().trim();
    if (!search) return this.assets();
    return this.assets().filter(a => a.filename.toLowerCase().includes(search));
  });

  visibleAssets = computed(() => this.filteredAssets().slice(0, this.page() * PAGE_SIZE));
  hasMore = computed(() => this.visibleAssets().length < this.filteredAssets().length);

  constructor() {
    effect(() => {
      // Réinitialiser la page quand les assets ou le filtre changent
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

  onDragStart(event: DragEvent, asset: AssetFile): void {
    event.dataTransfer?.setData('application/json', JSON.stringify(asset));
    this.assetDragStart.emit(asset);
  }
}
