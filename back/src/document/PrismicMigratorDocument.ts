import * as prismic from '@prismicio/client';
import { fetch, ProxyAgent } from 'undici';
import axios, { AxiosInstance } from 'axios';

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

export interface DocumentMigrationResult {
  success: boolean;
  id?: string;
  error?: string;
}

const PAGE_SIZE = 30;
const MIGRATION_API_URL = 'https://migration.prismic.io';

export class PrismicMigratorDocument {
  private readonly destinationRepositoryName: string;
  private readonly destinationWriteToken: string;
  private readonly sourcePrismicClient: prismic.Client;
  private readonly destinationPrismicClient: prismic.Client;
  private readonly axiosInstance: AxiosInstance;

  constructor(
    sourceRepositoryName: string,
    sourceContentToken: string,
    destinationRepositoryName: string,
    destinationContentToken: string,
    destinationWriteToken: string,
    proxyUrl?: string,
    axiosInstance?: AxiosInstance,
  ) {
    this.destinationRepositoryName = destinationRepositoryName;
    this.destinationWriteToken = destinationWriteToken;
    this.axiosInstance = axiosInstance ?? axios.create();

    const fetchFn = proxyUrl
      ? (url: string, init?: Parameters<typeof fetch>[1]) =>
          fetch(url, { ...init, dispatcher: new ProxyAgent(proxyUrl) })
      : fetch;

    const clientOptions = (token: string): prismic.ClientConfig => ({
      accessToken: token,
      fetch: fetchFn as prismic.ClientConfig['fetch'],
    });

    this.sourcePrismicClient = prismic.createClient(sourceRepositoryName, clientOptions(sourceContentToken));
    this.destinationPrismicClient = prismic.createClient(destinationRepositoryName, clientOptions(destinationContentToken));
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
    return this.fetchDocuments(this.sourcePrismicClient, page, type);
  }

  async getTargetDocuments(page: number, type?: string): Promise<PaginatedDocuments> {
    return this.fetchDocuments(this.destinationPrismicClient, page, type);
  }

  async migrateDocument(id: string): Promise<DocumentMigrationResult> {
    try {
      // 1. Récupérer le document source par son id
      const doc = await this.sourcePrismicClient.getByID(id);

      // 2. Construire le body — title = uid ?? id
      const body = {
        title: doc.uid ?? doc.id,
        type: doc.type,
        uid: doc.uid ?? undefined,
        lang: doc.lang,
        data: doc.data,
      };

      // 3. POST vers la Migration API
      const { data } = await this.axiosInstance.post<{ id: string }>(
        `${MIGRATION_API_URL}/documents`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            'repository': this.destinationRepositoryName,
            'authorization': `Bearer ${this.destinationWriteToken}`,
          },
        }
      );

      return { success: true, id: data.id };
    } catch (error) {
      return {
        success: false,
        error: axios.isAxiosError(error)
          ? `${error.response?.status} - ${JSON.stringify(error.response?.data)}`
          : String(error),
      };
    }
  }
}
