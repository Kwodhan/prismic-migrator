import * as prismic from '@prismicio/client';
import { fetch, ProxyAgent } from 'undici';

export interface PrismicDocument {
  id: string;
  uid: string | null;
  type: string;
  url: string | null;
  first_publication_date: string | null;
  last_publication_date: string | null;
}

export interface PaginatedDocuments {
  documents: PrismicDocument[];
  page: number;
  totalPages: number;
  totalDocuments: number;
}

const PAGE_SIZE = 30;

export class PrismicMigratorDocument {
  private readonly sourceClient: prismic.Client;
  private readonly destinationClient: prismic.Client;

  constructor(
    sourceRepositoryName: string,
    sourceToken: string,
    destinationRepositoryName: string,
    destinationToken: string,
    proxyUrl?: string,
  ) {
    const fetchFn = proxyUrl
      ? (url: string, init?: Parameters<typeof fetch>[1]) =>
          fetch(url, { ...init, dispatcher: new ProxyAgent(proxyUrl) })
      : fetch;

    const clientOptions = (token: string): prismic.ClientConfig => ({
      accessToken: token,
      fetch: fetchFn as prismic.ClientConfig['fetch'],
    });

    this.sourceClient = prismic.createClient(sourceRepositoryName, clientOptions(sourceToken));
    this.destinationClient = prismic.createClient(destinationRepositoryName, clientOptions(destinationToken));
  }

  private async fetchDocuments(client: prismic.Client, page: number, type?: string): Promise<PaginatedDocuments> {
    const filters = type ? [prismic.filter.at('document.type', type)] : [];
    const response = await client.get({ pageSize: PAGE_SIZE, page, filters });

    return {
      documents: response.results.map(doc => ({
        id: doc.id,
        uid: doc.uid ?? null,
        type: doc.type,
        url: doc.url ?? null,
        first_publication_date: doc.first_publication_date,
        last_publication_date: doc.last_publication_date,
      })),
      page: response.page,
      totalPages: response.total_pages,
      totalDocuments: response.total_results_size,
    };
  }

  async getSourceDocuments(page: number, type?: string): Promise<PaginatedDocuments> {
    return this.fetchDocuments(this.sourceClient, page, type);
  }

  async getTargetDocuments(page: number, type?: string): Promise<PaginatedDocuments> {
    return this.fetchDocuments(this.destinationClient, page, type);
  }
}
