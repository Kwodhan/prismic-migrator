import { describe, expect, it, vi } from 'vitest';
import { DocumentFetcher } from '../DocumentFetcher';

describe('DocumentFetcher', () => {
  it.each([
    {
      referenceType: 'document' as const,
      reference: 'linked-doc',
      field: { link_type: 'Document', id: 'linked-doc', type: 'article' },
    },
    {
      referenceType: 'media' as const,
      reference: 'media-id',
      field: { link_type: 'Media', id: 'media-id', url: 'https://cdn.example/file.pdf' },
    },
    {
      referenceType: 'url' as const,
      reference: 'https://example.com/page',
      field: { link_type: 'Web', url: 'https://example.com/page' },
    },
  ])('finds documents referencing a $referenceType', async ({ referenceType, reference, field }) => {
    const client = {
      get: vi.fn()
        .mockResolvedValueOnce({
          results: [{ id: 'one', uid: 'one', type: 'article', data: { nested: [field] } }],
          page: 1,
          total_pages: 1,
        }),
    };
    const fetcher = new DocumentFetcher({} as any);

    const result = await fetcher.findDocumentsByReference(client as any, referenceType, reference);

    expect(result.documents.map(doc => doc.id)).toEqual(['one']);
    expect(result.totalDocuments).toBe(1);
  });

  it('fetches all pages before returning reference matches', async () => {
    const client = {
      get: vi.fn()
        .mockResolvedValueOnce({
          results: [{ id: 'first', type: 'article', data: { link: { link_type: 'Document', id: 'target' } } }],
          page: 1,
          total_pages: 2,
        })
        .mockResolvedValueOnce({
          results: [{ id: 'second', type: 'article', data: { link: { link_type: 'Document', id: 'target' } } }],
          page: 2,
          total_pages: 2,
        }),
    };
    const fetcher = new DocumentFetcher({} as any);

    const result = await fetcher.findDocumentsByReference(client as any, 'document', 'target');

    expect(client.get).toHaveBeenCalledTimes(2);
    expect(result.documents.map(doc => doc.id)).toEqual(['first', 'second']);
  });

  it('matches image fields by media URL despite image transformation parameters', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({
        results: [{
          id: 'with-image',
          type: 'article',
          data: {
            image: {
              id: 'media-id',
              url: 'https://cdn.example/image.jpg?auto=compress',
              dimensions: { width: 100, height: 100 },
            },
          },
        }],
        page: 1,
        total_pages: 1,
      }),
    };
    const fetcher = new DocumentFetcher({} as any);

    const result = await fetcher.findDocumentsByReference(
      client as any,
      'media',
      'https://cdn.example/image.jpg',
    );

    expect(result.documents.map(doc => doc.id)).toEqual(['with-image']);
  });

  it('fetches every page when searching documents by slice', async () => {
    const docs = [
      { id: 'first', uid: 'first', type: 'article', data: { body: [{ slice_type: 'hero' }] } },
      { id: 'second', uid: 'second', type: 'article', data: { body: [{ slice_type: 'hero' }] } },
    ];
    const client = {
      get: vi.fn()
        .mockResolvedValueOnce({ results: [docs[0]], page: 1, total_pages: 2 })
        .mockResolvedValueOnce({ results: [docs[1]], page: 2, total_pages: 2 }),
    };
    const customTypes = {
      getCustomTypes: vi.fn().mockResolvedValue([
        {
          id: 'article',
          json: {
            Main: {
              body: {
                type: 'Slices',
                config: { choices: { hero: {} } },
              },
            },
          },
        },
      ]),
    };
    const fetcher = new DocumentFetcher(customTypes as any);

    const result = await fetcher.fetchDocumentsBySlice('repo', client as any, 1, 'hero');

    expect(client.get).toHaveBeenCalledTimes(2);
    expect(client.get).toHaveBeenNthCalledWith(1, expect.objectContaining({ page: 1 }));
    expect(client.get).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 2 }));
    expect(result.documents.map(doc => doc.id)).toEqual(['first', 'second']);
    expect(result.totalDocuments).toBe(2);
  });
});
