import { CachedPrismicClient } from '../../CachedPrismicClient';
import * as prismic from '@prismicio/client';

/**
 * Reusable mock for CachedPrismicClient.
 * Allows simulating Prismic client responses without making real API calls.
 *
 * Usage:
 *   const mock = new MockCachedPrismicClient();
 *   mock.addDocument(doc1).addDocument(doc2);  // Fluent API
 *   const result = await mock.getByID(doc1.id);
 */
export class MockCachedPrismicClient implements Partial<CachedPrismicClient> {
  private readonly documentsById = new Map<string, prismic.PrismicDocument>();
  private readonly documentsByType = new Map<string, prismic.PrismicDocument[]>();
  private readonly documentsByUID = new Map<string, prismic.PrismicDocument>();

  /**
   * Adds a document to the mock (indexed by ID, type, and UID if present).
   * Returns this to allow method chaining (fluent API).
   */
  addDocument(doc: prismic.PrismicDocument): this {
    this.documentsById.set(doc.id, doc);

    const type = doc.type;
    if (!this.documentsByType.has(type)) {
      this.documentsByType.set(type, []);
    }
    this.documentsByType.get(type)!.push(doc);

    if (doc.uid) {
      this.documentsByUID.set(`${type}:${doc.uid}`, doc);
    }

    return this;
  }

  /**
   * Retrieves a document by its ID.
   * Throws an error if the document does not exist.
   */
  async getByID(id: string): Promise<prismic.PrismicDocument> {
    const doc = this.documentsById.get(id);
    if (!doc) throw new Error(`Document ${id} not found`);
    return doc;
  }

  /**
   * Retrieves all documents of a given type.
   * Returns an empty array if no document of that type exists.
   */
  async getByType(type: string): Promise<prismic.PrismicDocument[]> {
    return this.documentsByType.get(type) ?? [];
  }

  /**
   * Retrieves a document by its type and UID.
   * Throws an error if the document does not exist.
   */
  async getByUID(type: string, uid: string): Promise<prismic.PrismicDocument> {
    const doc = this.documentsByUID.get(`${type}:${uid}`);
    if (!doc) throw new Error(`Document ${type}:${uid} not found`);
    return doc;
  }

  /**
   * Resets the mock (useful for cleaning up between tests).
   */
  reset(): void {
    this.documentsById.clear();
    this.documentsByType.clear();
    this.documentsByUID.clear();
  }
}
