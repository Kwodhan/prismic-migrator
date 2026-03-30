// typescript
import * as prismic from '@prismicio/client';

type CacheEntry = { value: unknown; expiresAt: number };

/**
 * Simple wrapper for prismic.Client with TTL cache + LRU + in-flight dedupe.
 */
export class CachedPrismicClient {
    private readonly cache = new Map<string, CacheEntry>();
    private readonly pending = new Map<string, Promise<unknown>>();

    constructor(
        private readonly client: prismic.Client,
        private readonly ttlMs = 60_000, // 1 minute by default
        private readonly maxSize = 1000
    ) {
    }

    private makeKey(method: string, ...args: unknown[]): string {
        try {
            return method + ':' + JSON.stringify(args);
        } catch {
            // Fallback if JSON.stringify fails
            return method + ':' + args.map(String).join('|');
        }
    }

    private getFromCache<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        // LRU bump: reinsert to move it to the end
        this.cache.delete(key);
        this.cache.set(key, entry);
        return structuredClone(entry.value) as T;
    }

    private setCache(key: string, value: unknown) {
        if (this.cache.has(key)) this.cache.delete(key);
        this.cache.set(key, {value, expiresAt: Date.now() + this.ttlMs});
        // Simple LRU eviction
        while (this.cache.size > this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (!oldestKey) break;
            this.cache.delete(oldestKey);
        }
    }

    private async fetchWithCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
        const cached = this.getFromCache<T>(key);
        if (cached !== null) return cached;

        const pending = this.pending.get(key);
        if (pending) {
            return pending as Promise<T>;
        }

        const p = fn()
            .then(res => {
                this.setCache(key, res);
                this.pending.delete(key);
                return res;
            })
            .catch(err => {
                this.pending.delete(key);
                throw err;
            });

        this.pending.set(key, p);
        return p;
    }

    // Examples of commonly used methods
    async getByID(id: string, options?: unknown): Promise<prismic.PrismicDocument> {
        const key = this.makeKey('getByID', id, options ?? null);
        return this.fetchWithCache(key, () => this.client.getByID(id, options as any));
    }

    async getByUID(type: string, uid: string, options?: unknown): Promise<prismic.PrismicDocument> {
        const key = this.makeKey('getByUID', type, uid, options ?? null);
        return this.fetchWithCache(key, () => this.client.getByUID(type, uid, options as any));
    }

    async getByType(type: string, options?: unknown): Promise<prismic.PrismicDocument[]> {
        const key = this.makeKey('getByType', type, options ?? null);
        return this.fetchWithCache(key, async () => {
            const all: prismic.PrismicDocument[] = [];

            // Start at the page provided in options, or page 1
            const opts = (options ?? {}) as any;
            let page = typeof opts.page === 'number' ? opts.page : 1;

            // Fetch the first page, then iterate while `next_page` exists
            let resp: any = await this.client.getByType(type, {...opts, page});
            all.push(...(resp.results ?? []));

            // Loop while Prismic reports a next page
            while (resp?.next_page) {
                page += 1;
                resp = await this.client.getByType(type, {...opts, page});
                all.push(...(resp.results ?? []));

                // If total_pages is present, stop when it is reached
                if (typeof resp.total_pages === 'number' && page >= resp.total_pages) break;
            }

            return all;
        });
    }

    get repositoryName(){
        return this.client.repositoryName;
    }
}
