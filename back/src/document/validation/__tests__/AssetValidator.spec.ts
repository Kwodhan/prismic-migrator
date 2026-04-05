import {beforeEach, describe, expect, it} from 'vitest';
import * as prismic from '@prismicio/client';
import {AssetValidator} from '../validators';
import {DocumentBuilder} from './fixtures/document.builder';
import {MockPrismicMigratorAssets} from './mocks/mock-prismic-migrator-assets';

describe('AssetValidator', () => {
  let mockAssets: MockPrismicMigratorAssets;
  let validator: AssetValidator;

  beforeEach(() => {
    mockAssets = new MockPrismicMigratorAssets();
    validator = new AssetValidator('source-repo', 'target-repo', mockAssets as any);
  });

  it('should return valid result when document has no image', async () => {
    const doc = DocumentBuilder.create().withData({title: 'No image here'}).build();

    const result = await validator.validate(doc);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should return WARNING issues for image field, thumbnail and rich text image', async () => {
    const doc = DocumentBuilder.create().withData({
      hero: {
        id: 'img-main',
        url: 'https://images.prismic.io/source-repo/main.jpg',
        dimensions: {width: 1200, height: 800},
        mobile: {
          id: 'img-thumb',
          url: 'https://images.prismic.io/source-repo/thumb.jpg',
          dimensions: {width: 600, height: 400},
        },
      },
      content: [
        {type: 'paragraph', text: 'hello'},
        {
          type: 'image',
          id: 'img-rt',
          url: 'https://images.prismic.io/source-repo/rt.jpg',
          dimensions: {width: 500, height: 300},
        },
      ],
    }).build();

    const result = await validator.validate(doc);

    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(3);
    expect(result.issues.every(i => i.code === 'ASSET_NOT_FOUND')).toBe(true);
    expect(result.issues.every(i => i.severity === 'WARNING')).toBe(true);
  });

  it('should replace image URL/id when matching filename exists in target', async () => {
    const sourceAssetUrl = 'https://images.prismic.io/source-repo/main.jpg';
    const targetAssetUrl = 'https://images.prismic.io/target-repo/main.jpg';

    mockAssets
      .setAssets('source-repo', [
        {
          id: 'img-main',
          url: sourceAssetUrl,
          filename: 'main.jpg',
          kind: 'image',
          width: 1200,
          height: 800,
        },
      ])
      .setAssets('target-repo', [
        {
          id: 'img-target',
          url: targetAssetUrl,
          filename: 'main.jpg',
          kind: 'image',
          width: 1200,
          height: 800,
        },
      ]);

    const doc = DocumentBuilder.create().withData({
      hero: {
        id: 'img-main',
        url: `${sourceAssetUrl}?auto=compress`,
        dimensions: {width: 1200, height: 800},
        alt: 'Hero',
      },
    }).build();

    const validation = await validator.validate(doc);
    expect(validation.issues).toHaveLength(1);
    expect(validation.issues[0].code).toBe('ASSET_NOT_FOUND');
    expect(validation.issues[0].context).toMatchObject({
      id: 'img-main',
      url: `${sourceAssetUrl}?auto=compress`,
    });

    const issues = validation.issues;
    const fixed = await validator.fix(doc, issues);
    const hero = fixed.data['hero'] as prismic.FilledImageFieldImage;

    expect(hero.id).toBe('img-target');
    expect(hero.url).toBe(`${targetAssetUrl}?auto=compress`);
    expect(issues[0].fixed).toBe(true);
    expect(issues[0].fixDescription).toContain('Asset found in target');
  });

  it('should clear image field when no target asset match is found', async () => {
    mockAssets.setAssets('source-repo', [{
      id: 'img-main',
      url: 'https://images.prismic.io/source-repo/main.jpg',
      filename: 'main.jpg',
      kind: 'image',
      width: 1200,
      height: 800,
    }]);

    const doc = DocumentBuilder.create().withData({
      hero: {
        id: 'img-main',
        url: 'https://images.prismic.io/source-repo/main.jpg',
        dimensions: {width: 1200, height: 800},
      },
    }).build();

    const validation = await validator.validate(doc);
    expect(validation.issues).toHaveLength(1);
    expect(validation.issues[0].code).toBe('ASSET_NOT_FOUND');
    expect(validation.issues[0].context).toMatchObject({
      id: 'img-main',
      url: 'https://images.prismic.io/source-repo/main.jpg',
    });

    const issues = validation.issues;
    const fixed = await validator.fix(doc, issues);

    expect(fixed.data['hero']).toEqual({});
    expect(issues[0].fixed).toBe(false);
  });
});

