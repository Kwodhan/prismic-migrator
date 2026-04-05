import {beforeEach, describe, expect, it} from 'vitest';
import {LinkMediaValidator} from '../validators';
import {DocumentBuilder} from './fixtures/document.builder';
import {MockPrismicMigratorAssets} from './mocks/mock-prismic-migrator-assets';

describe('LinkMediaValidator', () => {
  let mockAssets: MockPrismicMigratorAssets;
  let validator: LinkMediaValidator;

  beforeEach(() => {
	mockAssets = new MockPrismicMigratorAssets();
	validator = new LinkMediaValidator('target-repo', mockAssets as any);
  });

  it('should return valid result when document has no media links', async () => {
	const doc = DocumentBuilder.create().withData({title: 'No media links'}).build();

	const result = await validator.validate(doc);

	expect(result.valid).toBe(true);
	expect(result.issues).toHaveLength(0);
  });

  it('should create warning issue for each missing media link id', async () => {
	mockAssets.setAssets('target-repo', [{
	  id: 'asset-ok',
	  url: 'https://images.prismic.io/target-repo/existing.pdf',
	  filename: 'existing.pdf',
	  kind: 'document',
	  width: 200,
	  height: 300,
	}]);

	const missingMedia = {
	  link_type: 'Media',
	  id: 'media-missing',
	  url: 'https://images.prismic.io/source-repo/missing.pdf',
	  name: 'missing.pdf',
	  kind: 'document',
	};

	const doc = DocumentBuilder.create().withData({
	  first: missingMedia,
	  nested: {
		list: [missingMedia, {
		  file: {
			link_type: 'Media',
			id: 'media-existing',
			url: 'https://images.prismic.io/source-repo/existing.pdf',
			name: 'existing.pdf',
			kind: 'document',
		  },
		}],
	  },
	}).build();

	const result = await validator.validate(doc);

	expect(result.valid).toBe(true);
	expect(result.issues).toHaveLength(1);
	expect(result.issues[0].code).toBe('LINKED_MEDIA_NOT_FOUND');
	expect(result.issues[0].context).toMatchObject({
	  id: 'media-missing',
	  name: 'missing.pdf',
	});
  });

  it('should replace media link fields when target asset appears before fix', async () => {
	const sourceDoc = DocumentBuilder.create().withData({
	  media: {
		link_type: 'Media',
		id: 'media-source-id',
		url: 'https://images.prismic.io/source-repo/file.pdf',
		name: 'file.pdf',
		kind: 'document',
	  },
	}).build();

	const validation = await validator.validate(sourceDoc);
	expect(validation.issues).toHaveLength(1);
	expect(validation.issues[0].context).toMatchObject({
	  id: 'media-source-id',
	  name: 'file.pdf',
	});

	mockAssets.setAssets('target-repo', [{
	  id: 'media-target-id',
	  url: 'https://images.prismic.io/target-repo/file.pdf',
	  filename: 'file.pdf',
	  kind: 'document',
	  width: 200,
	  height: 300,
	}]);

	const issues = validation.issues;
	const fixed = await validator.fix(sourceDoc, issues);
	const media = fixed.data['media'] as any;

	expect(media.id).toBe('media-target-id');
	expect(media.url).toBe('https://images.prismic.io/target-repo/file.pdf');
	expect(media.name).toBe('file.pdf');
	expect(media.kind).toBe('document');
	expect(issues[0].fixed).toBe(true);
	expect(issues[0].fixDescription).toContain('file.pdf');
  });

  it('should clear media link when no matching target asset exists', async () => {
	const sourceDoc = DocumentBuilder.create().withData({
	  media: {
		link_type: 'Media',
		id: 'media-source-id',
		url: 'https://images.prismic.io/source-repo/file.pdf',
		name: 'file.pdf',
		kind: 'document',
	  },
	}).build();

	const validation = await validator.validate(sourceDoc);
	expect(validation.issues).toHaveLength(1);
	expect(validation.issues[0].code).toBe('LINKED_MEDIA_NOT_FOUND');

	const issues = validation.issues;
	const fixed = await validator.fix(sourceDoc, issues);

	expect(fixed.data['media']).toEqual({link_type: 'Any'});
	expect(issues[0].fixed).toBeUndefined();
  });
});

