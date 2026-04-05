import {beforeEach, describe, expect, it} from 'vitest';
import {SameStateCustomType} from '../validators';
import {DocumentBuilder} from './fixtures/document.builder';
import {MockPrismicMigratorCustomType} from './mocks/mock-prismic-migrator-custom-type';

describe('SameStateCustomType', () => {
  let mockCustomType: MockPrismicMigratorCustomType;
  let validator: SameStateCustomType;

  beforeEach(() => {
    mockCustomType = new MockPrismicMigratorCustomType();
    validator = new SameStateCustomType('source-repo', 'target-repo', mockCustomType as any);
  });

  it('should return valid result when source or target custom type is missing', async () => {
    mockCustomType.addCustomType('source-repo', 'article', {id: 'article', json: {}});

    const doc = DocumentBuilder.create().withType('article').build();

    const result = await validator.validate(doc);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should return valid result when source and target custom types are equal', async () => {
    const schema = {
      id: 'article',
      label: 'Article',
      json: {
        Main: {
          title: {type: 'Text'},
        },
      },
    };

    mockCustomType
      .addCustomType('source-repo', 'article', schema)
      .addCustomType('target-repo', 'article', schema);

    const doc = DocumentBuilder.create().withType('article').build();

    const result = await validator.validate(doc);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should return BLOCKING issue when source and target custom types differ', async () => {
    mockCustomType
      .addCustomType('source-repo', 'article', {
        id: 'article',
        json: {Main: {title: {type: 'Text'}}},
      })
      .addCustomType('target-repo', 'article', {
        id: 'article',
        json: {Main: {title: {type: 'StructuredText'}}},
      });

    const doc = DocumentBuilder.create().withType('article').build();

    const result = await validator.validate(doc);

    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toEqual(
      expect.objectContaining({
        severity: 'BLOCKING',
        code: 'CUSTOM_TYPE_NOT_SAME',
        validator: 'SameStateCustomType',
        fixable: false,
      })
    );
    expect(result.issues[0].message).toContain('article');
  });
});

