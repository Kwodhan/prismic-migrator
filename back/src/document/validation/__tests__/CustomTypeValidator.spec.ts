import {beforeEach, describe, expect, it} from 'vitest';
import {MockPrismicMigratorCustomType} from './mocks/mock-prismic-migrator-custom-type';
import {CustomTypeValidator} from '../validators';
import {DocumentBuilder} from './fixtures/document.builder';

describe('CustomTypeValidator', () => {
  let mockCustomType: MockPrismicMigratorCustomType;
  let validator: CustomTypeValidator;

  beforeEach(() => {
    mockCustomType = new MockPrismicMigratorCustomType();
    validator = new CustomTypeValidator(
      'target-repo',
      mockCustomType as any
    );
  });

  it('should return BLOCKING issue when custom type does not exist in target', async () => {
    const doc = DocumentBuilder.create().withType('missing_type').build();

    const result = await validator.validate(doc);

    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toEqual(
      expect.objectContaining({
        severity: 'BLOCKING',
        code: 'CUSTOM_TYPE_NOT_FOUND',
        validator: 'CustomTypeValidator',
        fixable: false,
      })
    );
  });

  it('should return valid result when custom type exists in target', async () => {
    const customTypeSchema = {id: 'blog_post', label: 'Blog Post', fields: {}};
    mockCustomType.addCustomType('target-repo', 'blog_post', customTypeSchema);

    const doc = DocumentBuilder.create().withType('blog_post').build();

    const result = await validator.validate(doc);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should handle large documents efficiently (reuse builder)', async () => {
    mockCustomType.addCustomType('target-repo', 'article', {id: 'article'});

    const largeDoc = DocumentBuilder.create()
      .withType('article')
      .withLargeBody(100) // 100 paragraphs
      .withImages(10)
      .build();

    const result1 = await validator.validate(largeDoc);
    const result2 = await validator.validate(largeDoc);
    const result3 = await validator.validate(largeDoc);

    expect(result1.valid).toBe(true);
    expect(result2.valid).toBe(true);
    expect(result3.valid).toBe(true);
  });

  it('should have correct error message with custom type name', async () => {
    const doc = DocumentBuilder.create()
      .withType('special_article')
      .build();

    const result = await validator.validate(doc);

    expect(result.issues[0].message).toContain('special_article');
    expect(result.issues[0].message).toContain('does not exist');
  });
});

