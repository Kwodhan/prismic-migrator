import * as prismic from '@prismicio/client';
import { PrismicMigratorCustomType } from '../custom-type/PrismicMigratorCustomType';
import { DocumentReferenceType, PaginatedDocuments } from '@shared/types';
import { getAnyTitle } from './document.utils';

const PAGE_SIZE = 100;

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

  async findDocumentsByReference(
    client: prismic.Client,
    referenceType: DocumentReferenceType,
    reference: string,
  ): Promise<PaginatedDocuments> {
    if (!client) {
      return { documents: [], page: 0, totalDocuments: 0, totalPages: 0 };
    }

    const allDocuments = await this.fetchFullDocumentsByType(client);
    const documents = allDocuments
      .filter(doc => this.documentReferences(doc.data, referenceType, reference))
      .map(doc => ({
        id: doc.id,
        uid: doc.uid ?? null,
        title: getAnyTitle(doc),
        type: doc.type,
        url: doc.url ?? null,
        first_publication_date: doc.first_publication_date,
        last_publication_date: doc.last_publication_date,
      }));

    return {
      documents,
      page: 1,
      totalPages: documents.length > 0 ? 1 : 0,
      totalDocuments: documents.length,
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
      const docs = await this.fetchFullDocumentsByType(client, ct.id);
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

  private async fetchFullDocumentsByType(client: prismic.Client, type?: string): Promise<prismic.PrismicDocument[]> {
    const filters = type ? [prismic.filter.at('document.type', type)] : [];
    let response = await client.get({ pageSize: PAGE_SIZE, page: 1, filters });
    const documents = [...response.results];

    while (response.page < response.total_pages) {
      response = await client.get({ pageSize: PAGE_SIZE, page: response.page + 1, filters });
      documents.push(...response.results);
    }

    return documents;
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
    console.log(doc.uid);
    for (const key of Object.keys(data)) {
      const field = data[key];
      if (Array.isArray(field)) {
        console.log(field);
        if (field.some((slice: any) => slice.slice_type === sliceName)) {
          return true;
        }
      }
    }
    return false;
  }

  private documentReferences(data: unknown, referenceType: DocumentReferenceType, reference: string): boolean {
    if (!data || typeof data !== 'object') return false;

    if (Array.isArray(data)) {
      return data.some(value => this.documentReferences(value, referenceType, reference));
    }

    const object = data as Record<string, unknown>;
    const linkType = object['link_type'];
    const id = object['id'];
    const url = object['url'];

    if (
      referenceType === 'document' &&
      linkType === 'Document' &&
      typeof id === 'string' &&
      id === reference
    ) {
      return true;
    }

    if (referenceType === 'media') {
      const mediaLink = linkType === 'Media' && typeof id === 'string';
      const imageField =
        typeof url === 'string' &&
        ('dimensions' in object || 'alt' in object || 'copyright' in object);
      if (
        (mediaLink || imageField) &&
        ((typeof id === 'string' && id === reference) ||
          (typeof url === 'string' && this.sameMediaUrl(url, reference)))
      ) {
        return true;
      }
    }

    if (
      referenceType === 'url' &&
      linkType === 'Web' &&
      typeof url === 'string' &&
      this.sameUrl(url, reference)
    ) {
      return true;
    }

    return Object.values(object).some(value =>
      this.documentReferences(value, referenceType, reference),
    );
  }

  private sameUrl(left: string, right: string): boolean {
    try {
      return new URL(left).toString() === new URL(right).toString();
    } catch {
      return left === right;
    }
  }

  private sameMediaUrl(left: string, right: string): boolean {
    const normalize = (value: string): string => {
      const url = new URL(value);
      url.search = '';
      url.hash = '';
      url.pathname = url.pathname.replace(/\/+$/, '');
      return url.toString();
    };

    try {
      return normalize(left) === normalize(right);
    } catch {
      return left === right;
    }
  }
}
