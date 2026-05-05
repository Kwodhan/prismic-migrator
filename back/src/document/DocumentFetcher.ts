import * as prismic from '@prismicio/client';
import { PrismicMigratorCustomType } from '../custom-type/PrismicMigratorCustomType';
import { PaginatedDocuments } from '@shared/types';
import { getAnyTitle } from './document.utils';

const PAGE_SIZE = 30;

export class DocumentFetcher {
  private readonly migratorCustomType: PrismicMigratorCustomType;

  constructor(migratorCustomType: PrismicMigratorCustomType) {
    this.migratorCustomType = migratorCustomType;
  }

  async fetchDocuments(client: prismic.Client, page: number, type?: string): Promise<PaginatedDocuments> {
    if (!client) {
      return {
        documents: [],
        page: 0,
        totalDocuments: 0,
        totalPages: 0,
      };
    }

    const filters = type ? [prismic.filter.at('document.type', type)] : [];
    const response = await client.get({ pageSize: PAGE_SIZE, page, filters });

    return {
      documents: response.results.map(doc => ({
        id: doc.id,
        uid: doc.uid ?? null,
        title: getAnyTitle(doc),
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

  async fetchDocumentsBySlice(repoName: string, client: prismic.Client, page: number, sliceName: string): Promise<PaginatedDocuments> {
    if (!client) {
      return {
        documents: [],
        page: 0,
        totalDocuments: 0,
        totalPages: 0,
      };
    }

    const customTypes = await this.migratorCustomType.getCustomTypes(repoName);
    const typesWithSlice = customTypes.filter(ct => this.hasSliceInCustomType(ct.json, sliceName));

    const allDocs: prismic.PrismicDocument[] = [];
    for (const ct of typesWithSlice) {
      const docs = await this.fetchFullDocumentsByType(client, 1, ct.id);
      const docsWithSlice = docs.filter(doc => this.hasSliceInDocument(doc, sliceName));
      allDocs.push(...docsWithSlice);
    }

    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageDocs = allDocs.slice(start, end);

    return {
      documents: pageDocs.map(doc => ({
        id: doc.id,
        uid: doc.uid ?? null,
        title: getAnyTitle(doc),
        type: doc.type,
        url: doc.url ?? null,
        first_publication_date: doc.first_publication_date,
        last_publication_date: doc.last_publication_date,
      })),
      page,
      totalPages: Math.ceil(allDocs.length / PAGE_SIZE),
      totalDocuments: allDocs.length,
    };
  }

  private async fetchFullDocumentsByType(client: prismic.Client, page: number, type?: string): Promise<prismic.PrismicDocument[]> {
    const filters = type ? [prismic.filter.at('document.type', type)] : [];
    const response = await client.get({ pageSize: PAGE_SIZE, page, filters });
    return response.results;
  }

  private hasSliceInCustomType(json: Record<string, unknown>, sliceName: string): boolean {
    for (const tab of Object.values(json)) {
      if (typeof tab === 'object' && tab) {
        for (const field of Object.values(tab as Record<string, unknown>)) {
          if (typeof field === 'object' && field && 'type' in field && (field as any).type === 'Slices' && 'config' in field && typeof (field as any).config === 'object' && (field as any).config && 'choices' in (field as any).config && typeof (field as any).config.choices === 'object' && (field as any).config.choices && sliceName in (field as any).config.choices) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private hasSliceInDocument(doc: prismic.PrismicDocument, sliceName: string): boolean {
    const data = doc.data as any;
    for (const key of Object.keys(data)) {
      const field = data[key];
      if (Array.isArray(field)) {
        if (field.some((slice: any) => slice.slice_type === sliceName)) {
          return true;
        }
      }
    }
    return false;
  }
}
