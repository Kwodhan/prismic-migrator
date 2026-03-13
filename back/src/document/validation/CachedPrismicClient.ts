// typescript
import * as prismic from '@prismicio/client';

type CacheEntry = { value: unknown; expiresAt: number };

/**
 * Wrapper simple pour prismic.Client avec cache TTL + LRU + in-flight dedupe.
 */
export class CachedPrismicClient {
    private readonly cache = new Map<string, CacheEntry>();
    private readonly pending = new Map<string, Promise<unknown>>();

    constructor(
        private readonly client: prismic.Client,
        private readonly ttlMs = 60_000, // 1 minute par défaut
        private readonly maxSize = 1000
    ) {
    }

    private makeKey(method: string, ...args: unknown[]): string {
        try {
            return method + ':' + JSON.stringify(args);
        } catch {
            // fallback si JSON.stringify plante
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
        // LRU bump: réinsérer pour le mettre en fin
        this.cache.delete(key);
        this.cache.set(key, entry);
        return structuredClone(entry.value) as T;
    }

    private setCache(key: string, value: unknown) {
        if (this.cache.has(key)) this.cache.delete(key);
        this.cache.set(key, {value, expiresAt: Date.now() + this.ttlMs});
        // Eviction LRU simple
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

    // Exemples de méthodes courantes utilisées
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

            // Commencer à la page fournie dans options ou page 1
            const opts = (options ?? {}) as any;
            let page = typeof opts.page === 'number' ? opts.page : 1;

            // Récupérer la première page puis itérer tant qu'il y a une `next_page`
            let resp: any = await this.client.getByType(type, {...opts, page});
            all.push(...(resp.results ?? []));

            // Boucler tant que Prismic indique une page suivante
            while (resp?.next_page) {
                page += 1;
                resp = await this.client.getByType(type, {...opts, page});
                all.push(...(resp.results ?? []));

                // Si total_pages est présent, on peut arrêter quand on l'atteint
                if (typeof resp.total_pages === 'number' && page >= resp.total_pages) break;
            }

            return all;
        });
    }

    get repositoryName(){
        return this.client.repositoryName;
    }
}