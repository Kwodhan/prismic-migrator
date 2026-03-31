import {beforeEach, describe, expect, it} from 'vitest';
import {MockCachedPrismicClient} from './mocks/mock-cached-prismic-client';
import {ExactlySameDocumentValidator} from '../validators';
import {DocumentBuilder} from './fixtures/document.builder';

describe('ExactlySameDocumentValidator', () => {
  let mockSourceClient: MockCachedPrismicClient;
  let mockDestClient: MockCachedPrismicClient;
  let validator: ExactlySameDocumentValidator;

  beforeEach(() => {
    mockSourceClient = new MockCachedPrismicClient();
    mockDestClient = new MockCachedPrismicClient();
    validator = new ExactlySameDocumentValidator(
      mockSourceClient as any,
      mockDestClient as any
    );
  });

  it('should return BLOCKING when exactly same document (without UID) exists in target', async () => {
    const sharedData = {
      title: [{type: 'heading1', text: 'Same Title'}],
      content: 'Same content',
    };

    const sourceDoc = DocumentBuilder.create()
      .withUid(null)
      .withData(sharedData)
      .withId('source-id')
      .build();

    const destDoc = DocumentBuilder.create()
      .withUid(null)
      .withData(sharedData)
      .withId('dest-id')
      .withType('blog_post')
      .build();

    mockSourceClient.addDocument(sourceDoc);
    mockDestClient.addDocument(destDoc);

    const result = await validator.validate(sourceDoc);

    expect(result.valid).toBe(false);
    expect(result.issues[0]).toEqual(
      expect.objectContaining({
        severity: 'BLOCKING',
        code: 'DOCUMENT_ALREADY_EXISTS',
        validator: 'ExactlySameDocumentValidator',
        fixable: false,
      })
    );
  });

  it('should skip validation when document has UID', async () => {
    const doc = DocumentBuilder.create()
      .withUid('has-uid')
      .build();

    const result = await validator.validate(doc);

    expect(result.valid).toBe(true);
  });

  it('should pass when no identical document exists (even without UID)', async () => {
    const sourceDoc = DocumentBuilder.create()
      .withUid(null)
      .withData({title: 'Source Title'})
      .withId('source-id')
      .build();

    const diffDestDoc = DocumentBuilder.create()
      .withUid(null)
      .withData({title: 'Different Title'})
      .withId('dest-id')
      .withType('blog_post')
      .build();

    mockSourceClient.addDocument(sourceDoc);
    mockDestClient.addDocument(diffDestDoc);

    const result = await validator.validate(sourceDoc);

    expect(result.valid).toBe(true);
  });

  it('should detect duplicate only in same document type', async () => {
    const sharedData = {
      content: 'Shared content',
    };

    const sourceDoc = DocumentBuilder.create()
      .withUid(null)
      .withType('blog_post')
      .withData(sharedData)
      .withId('source-id')
      .build();

    // Same data but different type
    const destDoc = DocumentBuilder.create()
      .withUid(null)
      .withType('article')  // Different type
      .withData(sharedData)
      .withId('dest-id')
      .build();

    mockSourceClient.addDocument(sourceDoc);
    mockDestClient.addDocument(destDoc);

    const result = await validator.validate(sourceDoc);

    // No conflict because types are different
    expect(result.valid).toBe(true);
  });

  it('should include existing document ID in error message', async () => {
    const sharedData = {title: 'Same'};

    const sourceDoc = DocumentBuilder.create()
      .withUid(null)
      .withData(sharedData)
      .withId('source-id')
      .build();

    const destDoc = DocumentBuilder.create()
      .withUid(null)
      .withData(sharedData)
      .withId('existing-dest-id-12345')
      .build();

    mockSourceClient.addDocument(sourceDoc);
    mockDestClient.addDocument(destDoc);

    const result = await validator.validate(sourceDoc);

    expect(result.issues[0].message).toContain('existing-dest-id-12345');
  });
});

