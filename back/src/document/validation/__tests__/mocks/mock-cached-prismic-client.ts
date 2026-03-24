import { CachedPrismicClient } from '../../CachedPrismicClient';
import * as prismic from '@prismicio/client';

/**
 * Mock réutilisable du CachedPrismicClient.
 * Permet de simuler les réponses du client Prismic sans faire d'appels réels.
 *
 * Utilisation :
 *   const mock = new MockCachedPrismicClient();
 *   mock.addDocument(doc1).addDocument(doc2);  // Fluent API
 *   const result = await mock.getByID(doc1.id);
 */
export class MockCachedPrismicClient implements Partial<CachedPrismicClient> {
  private documentsById = new Map<string, prismic.PrismicDocument>();
  private documentsByType = new Map<string, prismic.PrismicDocument[]>();
  private documentsByUID = new Map<string, prismic.PrismicDocument>();

  /**
   * Ajoute un document au mock (indexé par ID, type, et UID si présent).
   * Retourne this pour permettre la chaîne d'appels (fluent API).
   */
  addDocument(doc: prismic.PrismicDocument): this {
    this.documentsById.set(doc.id, doc);

    const type = doc.type;
    if (!this.documentsByType.has(type)) {
      this.documentsByType.set(type, []);
    }
    this.documentsByType.get(type)!.push(doc);

    if (doc.uid) {
      this.documentsByUID.set(`${type}:${doc.uid}`, doc);
    }

    return this;
  }

  /**
   * Récupère un document par son ID.
   * Lance une erreur si le document n'existe pas.
   */
  async getByID(id: string): Promise<prismic.PrismicDocument> {
    const doc = this.documentsById.get(id);
    if (!doc) throw new Error(`Document ${id} not found`);
    return doc;
  }

  /**
   * Récupère tous les documents d'un type donné.
   * Retourne un tableau vide si aucun document du type n'existe.
   */
  async getByType(type: string): Promise<prismic.PrismicDocument[]> {
    return this.documentsByType.get(type) ?? [];
  }

  /**
   * Récupère un document par son type et son UID.
   * Lance une erreur si le document n'existe pas.
   */
  async getByUID(type: string, uid: string): Promise<prismic.PrismicDocument> {
    const doc = this.documentsByUID.get(`${type}:${uid}`);
    if (!doc) throw new Error(`Document ${type}:${uid} not found`);
    return doc;
  }

  /**
   * Réinitialise le mock (utile pour nettoyer entre les tests).
   */
  reset(): void {
    this.documentsById.clear();
    this.documentsByType.clear();
    this.documentsByUID.clear();
  }
}

