import {DocumentValidator} from '../DocumentValidator';
import {ValidationResultUtils} from '../ValidationResult';
import * as prismic from '@prismicio/client';
import {ValidationIssue, ValidationResult} from "@shared/types";
import _ from 'lodash';
import {CachedPrismicClient} from "../CachedPrismicClient";

const FIELDS_TO_IGNORE_WHEN_COMPARING_DOCUMENTS = ['id', 'key', 'icon', 'href','first_publication_date','last_publication_date'];


export class LinkDocumentValidator implements DocumentValidator {
  constructor(
    private readonly sourcePrismicClient: CachedPrismicClient,
    private readonly destinationPrismicClient: CachedPrismicClient
  ) {
  }

  /**
   * Detect if an object is a FilledContentRelationshipField.
   * Discriminator: link_type === "Document" + id string.
   */
  private isDocumentLink(value: unknown): value is prismic.FilledContentRelationshipField {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const v = value as Record<string, unknown>;
    return v['link_type'] === 'Document' && typeof v['id'] === 'string';
  }

  /**
   * Recursively traverse doc.data and collect all FilledContentRelationshipField.
   * Deduplicate by id.
   */
  private extractLinks(data: unknown, found: Map<string, prismic.FilledContentRelationshipField> = new Map()): Map<string, prismic.FilledContentRelationshipField> {
    if (!data || typeof data !== 'object') return found;

    if (Array.isArray(data)) {
      for (const item of data) {
        this.extractLinks(item, found);
      }
      return found;
    }

    const obj = data as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (this.isDocumentLink(value)) {
        found.set(value.id, value);
      } else {
        this.extractLinks(value, found);
      }
    }

    return found;
  }

  async validate(doc: prismic.PrismicDocument): Promise<ValidationResult> {
    const links = this.extractLinks(doc.data);

    if (links.size === 0) return ValidationResultUtils.ok();

    const issues: ValidationIssue[] = [];

    for (const link of links.values()) {
      issues.push({
        severity: 'WARNING',
        code: 'LINKED_DOCUMENT_NOT_FOUND',
        validator: this.constructor.name,
        message: `Linked document missing in target (uid: ${link.uid}, type: ${link.type})`,
        fixable: true,
        fixed: false,
        urlHint: `https://${this.sourcePrismicClient.repositoryName}.prismic.io/builder/pages/${link.id}`,
        context: {id: link.id, type: link.type, uid: link.uid},
      });
    }

    return {valid: true, issues};
  }

  async fix(doc: prismic.PrismicDocument, issues: ValidationIssue[]): Promise<prismic.PrismicDocument> {
    // Build a map uid -> new id in target
    const replacements = new Map<string, string>();

    for (const issue of issues) {

      const id = issue.context!['id'] as string;
      const uid = issue.context?.['uid'] as string;
      const type = issue.context?.['type'] as string;
      if (!type) {
        continue;
      }
      if (!uid) {
        const idTarget = await this.foundIdTargetDocument(id, type);
        if (idTarget) {
          replacements.set(issue.context!['id'] as string, idTarget);
          issue.fixed = true;
          issue.fixDescription = `Linked document found in target (id: ${idTarget})`;
        } else {
          const allDocsDestinationType = await this.destinationPrismicClient.getByType(type);
          const sourceDoc = await this.sourcePrismicClient.getByID(id).catch(() => null);
          for (const docDest of allDocsDestinationType) {
            if (sourceDoc && this.areEquivalent(docDest.data, sourceDoc.data)) {
              replacements.set(issue.context!['id'] as string, docDest.id);
              issue.fixed = true;
              issue.fixDescription = `Linked document found in target (id: ${docDest.id})`;
              break;
            }
          }
        }

      } else {

        const found = await this.destinationPrismicClient.getByUID(type, uid).catch(() => null);

        if (found) {
          replacements.set(issue.context!['id'] as string, found.id);
          issue.fixed = true;
          issue.fixDescription = `Linked document found in target (id: ${found.id})`;
        }
      }


    }

    if (replacements.size === 0) {
      return doc;
    }

    return {
      ...doc,
      data: this.replaceLinks(doc.data, replacements) as Record<string, unknown>,
    };
  }

  private replaceLinks(data: unknown, replacements: Map<string, string>): unknown {
    if (!data || typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      return data.map(item => this.replaceLinks(item, replacements));
    }

    if (this.isDocumentLink(data)) {
      const newId = replacements.get(data.id);
      if (newId) return {...data, id: newId};
      return data;
    }

    const obj = data as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      result[key] = this.replaceLinks(obj[key], replacements);
    }
    return result;
  }

  /**
   * Attempt to find in the target a document equivalent to the source document identified by idSource and type.
   * Comparison uses deep equality (lodash.isEqual) between the two documents.
   * @param idSource
   * @param type
   * @private
   */
  private async foundIdTargetDocument(idSource: string, type: string): Promise<string | null> {
    const allDocsDestinationType = await this.destinationPrismicClient.getByType(type);
    const docSource = await this.sourcePrismicClient.getByID(idSource).catch(() => null);
    if (!docSource) {
      return null;
    }
    const match = allDocsDestinationType.find(docDest => this.areEquivalent(docDest.data, docSource.data));
    if (match) return match.id;
    return null;
  }


  /**
   * Deep equality that ignores FIELDS_TO_IGNORE_WHEN_COMPARING_DOCUMENTS at every level.
   */
  private areEquivalent(a: unknown, b: unknown): boolean {
    return _.isEqualWith(a, b, (x, y) => {
      if (!_.isPlainObject(x) || !_.isPlainObject(y)) return undefined;
      const cleanX = _.omit(x, FIELDS_TO_IGNORE_WHEN_COMPARING_DOCUMENTS);
      const cleanY = _.omit(y, FIELDS_TO_IGNORE_WHEN_COMPARING_DOCUMENTS);
      const keys = Object.keys(cleanX);
      return keys.length === Object.keys(cleanY).length
        && keys.every(k => _.has(cleanY, k) && this.areEquivalent(cleanX[k], cleanY[k]));
    });
  }
}
