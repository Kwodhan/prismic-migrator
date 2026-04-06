import * as prismic from '@prismicio/client';

/**
 * Document Builder for creating test documents without recreating them each time.
 *
 */
export class DocumentBuilder {
  private id: string = 'test-doc-id';
  private type: string = 'blog_post';
  private uid: string | null = 'test-slug';
  private data: Record<string, any> = {
    title: [{ type: 'heading1', text: 'Test Title' }],
    body: [],
  };
  private readonly lang: string = 'en-US';
  private readonly tags: string[] = [];

  static create(): DocumentBuilder {
    return new DocumentBuilder();
  }

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withType(type: string): this {
    this.type = type;
    return this;
  }

  withUid(uid: string | null): this {
    this.uid = uid;
    return this;
  }

  withData(data: Record<string, any>): this {
    this.data = { ...data };
    return this;
  }

  /**
   * Creates a large document with many paragraphs.
   * Useful for testing performance without recreating the document for each test.
   */
  withLargeBody(paragraphs: number = 100): this {
    this.data = {
      title: [{ type: 'heading1', text: 'Test Title' }],
      body: Array.from({ length: paragraphs }, (_, i) => ({
        type: 'paragraph',
        text: `Paragraph ${i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. `.repeat(20),
      })),
    };
    return this;
  }

  /**
   * Adds images to the document to test asset validation.
   * Creates a gallery with a configurable number of images.
   */
  withImages(count: number = 3): this {
    this.data = {
      ...this.data,
      gallery: Array.from({ length: count }, (_, i) => ({
        image: {
          dimensions: { width: 1920, height: 1080 },
          alt: `Image ${i + 1}`,
          copyright: null,
          url: `https://prismic-example.cdn.prismic.io/assets/image-${i + 1}.jpg`,
          id: `image-${i + 1}`,
          name: `image-${i + 1}`,
        },
      })),
    };
    return this;
  }

  /**
   * Adds document links to test reference validation.
   * Creates relation fields pointing to other documents.
   */
  withLinks(count: number = 3): this {
    this.data = {
      ...this.data,
      relatedPosts: Array.from({ length: count }, (_, i) => ({
        document: {
          id: `related-doc-${i + 1}`,
          type: 'blog_post',
          uid: `related-slug-${i + 1}`,
          lang: 'en-US',
          slug: `related-slug-${i + 1}`,
          tags: [],
          first_publication_date: '2024-01-01T00:00:00+0000',
          last_publication_date: '2024-01-01T00:00:00+0000',
          data: {},
        },
      })),
    };
    return this;
  }

  /**
   * Builds and returns the constructed Prismic document.
   * This method creates the final object once, reusable across tests.
   */
  build(): prismic.PrismicDocument {
    return {
      id: this.id,
      type: this.type,
      uid: this.uid ?? undefined,
      data: this.data,
      lang: this.lang,
      tags: this.tags,
      first_publication_date: '2024-01-01T00:00:00+0000',
      last_publication_date: '2024-01-01T00:00:00+0000',
      alternate_languages: [],
      url: this.uid ? `/blog/${this.uid}` : undefined,
      slugs: this.uid ? [this.uid] : [],
    } as unknown as prismic.PrismicDocument;
  }
}
