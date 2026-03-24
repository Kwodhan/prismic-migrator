import {PrismicMigratorCustomType} from '../../../../custom-type/PrismicMigratorCustomType';

/**
 * Mock pour PrismicMigratorCustomType.
 * Permet de simuler les custom types sans faire d'appels à l'API Prismic.
 *
 * Utilisation :
 *   const mock = new MockPrismicMigratorCustomType();
 *   mock.addCustomType('repo', 'blog_post', { id: 'blog_post', label: 'Blog Post' });
 *   const result = await mock.getCustomTypeById('repo', 'blog_post');
 */
export class MockPrismicMigratorCustomType implements Partial<PrismicMigratorCustomType> {
  private customTypes = new Map<string, Record<string, any>>();

  /**
   * Ajoute un custom type au mock.
   * La clé est `repoName:type` pour supporter plusieurs repositories.
   */
  addCustomType(repoName: string, type: string, schema: Record<string, any>): this {
    const key = `${repoName}:${type}`;
    this.customTypes.set(key, schema);
    return this;
  }

  /**
   * Récupère un custom type par son nom et type.
   * Retourne null si le custom type n'existe pas (plutôt qu'une erreur).
   */
  async getCustomTypeById(repoName: string, type: string): Promise<any> {
    const key = `${repoName}:${type}`;
    return this.customTypes.get(key) ?? null;
  }

  /**
   * Réinitialise le mock (utile pour nettoyer entre les tests).
   */
  reset(): void {
    this.customTypes.clear();
  }
}

