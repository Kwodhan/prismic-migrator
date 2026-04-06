import {PrismicMigratorCustomType} from '../../../../custom-type/PrismicMigratorCustomType';

/**
 * Mock for PrismicMigratorCustomType.
 * Allows simulating custom types without making real Prismic API calls.
 *
 * Usage:
 *   const mock = new MockPrismicMigratorCustomType();
 *   mock.addCustomType('repo', 'blog_post', { id: 'blog_post', label: 'Blog Post' });
 *   const result = await mock.getCustomTypeById('repo', 'blog_post');
 */
export class MockPrismicMigratorCustomType implements Partial<PrismicMigratorCustomType> {
  private readonly customTypes = new Map<string, Record<string, any>>();

  /**
   * Adds a custom type to the mock.
   * The key is `repoName:type` to support multiple repositories.
   */
  addCustomType(repoName: string, type: string, schema: Record<string, any>): this {
    const key = `${repoName}:${type}`;
    this.customTypes.set(key, schema);
    return this;
  }

  /**
   * Retrieves a custom type by its name and type.
   * Returns null if the custom type does not exist (rather than throwing an error).
   */
  async getCustomTypeById(repoName: string, type: string): Promise<any> {
    const key = `${repoName}:${type}`;
    return this.customTypes.get(key) ?? null;
  }

  /**
   * Resets the mock (useful for cleaning up between tests).
   */
  reset(): void {
    this.customTypes.clear();
  }
}
