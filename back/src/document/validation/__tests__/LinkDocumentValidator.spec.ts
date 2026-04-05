import {beforeEach, describe, expect, it} from 'vitest';
import {LinkDocumentValidator} from '../validators';
import {DocumentBuilder} from './fixtures/document.builder';
import {MockCachedPrismicClient} from './mocks/mock-cached-prismic-client';

describe('LinkDocumentValidator', () => {
  let mockSourceClient: MockCachedPrismicClient;
  let mockDestinationClient: MockCachedPrismicClient;
  let validator: LinkDocumentValidator;

  beforeEach(() => {
    mockSourceClient = new MockCachedPrismicClient();
    mockDestinationClient = new MockCachedPrismicClient();
    validator = new LinkDocumentValidator(mockSourceClient as any, mockDestinationClient as any);
  });

  it('should return valid result when document has no document links', async () => {
    const doc = DocumentBuilder.create().withData({title: 'No links'}).build();

    const result = await validator.validate(doc);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should create one warning issue per unique linked document id', async () => {
    const link1 = {link_type: 'Document', id: 'doc-1', type: 'article', uid: 'article-1'};
    const link2 = {link_type: 'Document', id: 'doc-2', type: 'article', uid: 'article-2'};

    const doc = DocumentBuilder.create().withData({
      first: link1,
      nested: {
        arr: [link1, {ref: link2}],
      },
    }).build();

    const result = await validator.validate(doc);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(2);
    expect(result.issues.every(i => i.code === 'LINKED_DOCUMENT_NOT_FOUND')).toBe(true);
    expect(result.issues.every(i => i.severity === 'WARNING')).toBe(true);
  });

  it('should replace linked document id using UID lookup in target', async () => {
    const targetDoc = DocumentBuilder.create()
      .withType('article')
      .withUid('article-uid')
      .withId('target-id-uid')
      .build();
    mockDestinationClient.addDocument(targetDoc);

    const sourceDoc = DocumentBuilder.create().withData({
      relation: {
        link_type: 'Document',
        id: 'source-link-id',
        type: 'article',
        uid: 'article-uid',
      },
    }).build();

    const validation = await validator.validate(sourceDoc);
    expect(validation.issues).toHaveLength(1);
    expect(validation.issues[0].code).toBe('LINKED_DOCUMENT_NOT_FOUND');
    expect(validation.issues[0].context).toMatchObject({
      id: 'source-link-id',
      type: 'article',
      uid: 'article-uid',
    });

    const issues = validation.issues;
    const fixed = await validator.fix(sourceDoc, issues);

    expect((fixed.data['relation'] as any).id).toBe('target-id-uid');
    expect(issues[0].fixed).toBe(true);
    expect(issues[0].fixDescription).toContain('target-id-uid');
  });

  it('should fallback to exact content match when uid is missing', async () => {
    const linkedSourceDoc = DocumentBuilder.create()
      .withId('source-linked-doc')
      .withType('article')
      .withUid(null)
      .withData({title: 'Same', nested: {id: 'source-id', key: 'source-key', value: 1}})
      .build();

    const linkedDestinationDoc = DocumentBuilder.create()
      .withId('target-linked-doc')
      .withType('article')
      .withUid(null)
      .withData({title: 'Same', nested: {id: 'target-id', key: 'target-key', value: 1}})
      .build();

    mockSourceClient.addDocument(linkedSourceDoc);
    mockDestinationClient.addDocument(linkedDestinationDoc);

    const sourceDoc = DocumentBuilder.create().withData({
      relation: {
        link_type: 'Document',
        id: 'source-linked-doc',
        type: 'article',
      },
    }).build();

    const validation = await validator.validate(sourceDoc);
    expect(validation.issues).toHaveLength(1);
    expect(validation.issues[0].code).toBe('LINKED_DOCUMENT_NOT_FOUND');
    expect(validation.issues[0].context).toMatchObject({
      id: 'source-linked-doc',
      type: 'article',
    });

    const issues = validation.issues;
    const fixed = await validator.fix(sourceDoc, issues);

    expect((fixed.data['relation'] as any).id).toBe('target-linked-doc');
    expect(issues[0].fixed).toBe(true);
  });
});

