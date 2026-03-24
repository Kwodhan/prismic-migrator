import {beforeEach, describe, expect, it} from 'vitest';
import {MockCachedPrismicClient} from './mocks/mock-cached-prismic-client';
import {SameUIDDocumentValidator} from '../validators';
import {DocumentBuilder} from './fixtures/document.builder';


describe('SameUIDDocumentValidator', () => {
  let mockDestinationClient: MockCachedPrismicClient;
  let validator: SameUIDDocumentValidator;

  beforeEach(() => {
    mockDestinationClient = new MockCachedPrismicClient();
    validator = new SameUIDDocumentValidator(mockDestinationClient as any);
  });

  it('should return BLOCKING issue when document with same UID exists', async () => {
    const existingDoc = DocumentBuilder.create()
      .withType('blog_post')
      .withUid('existing-slug')
      .withId('existing-id')
      .build();

    mockDestinationClient.addDocument(existingDoc);

    const newDoc = DocumentBuilder.create()
      .withType('blog_post')
      .withUid('existing-slug')
      .withId('new-id')
      .build();

    const result = await validator.validate(newDoc);

    expect(result.valid).toBe(false);
    expect(result.issues[0]).toEqual(
      expect.objectContaining({
        severity: 'BLOCKING',
        code: 'DOCUMENT_ALREADY_EXISTS',
        validator: 'SameUIDDocumentValidator',
        fixable: false,
      })
    );
  });

  it('should return valid when no document with same UID exists', async () => {
    const doc = DocumentBuilder.create()
      .withType('blog_post')
      .withUid('new-slug')
      .build();

    const result = await validator.validate(doc);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should skip validation when document has no UID', async () => {
    const doc = DocumentBuilder.create()
      .withType('blog_post')
      .withUid(null)
      .build();

    const result = await validator.validate(doc);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should include UID in error message', async () => {
    const existingDoc = DocumentBuilder.create()
      .withType('blog_post')
      .withUid('my-special-slug')
      .build();

    mockDestinationClient.addDocument(existingDoc);

    const newDoc = DocumentBuilder.create()
      .withType('blog_post')
      .withUid('my-special-slug')
      .build();

    const result = await validator.validate(newDoc);

    expect(result.issues[0].message).toContain('my-special-slug');
  });
});

