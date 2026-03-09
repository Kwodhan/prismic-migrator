import {DocumentValidator} from '../DocumentValidator';
import {ValidationResultUtils} from '../ValidationResult';
import * as prismic from '@prismicio/client';
import {ValidationIssue, ValidationResult} from "@shared/types";
import _ from 'lodash';


export class LinkDocumentValidator implements DocumentValidator {
    constructor(
        private readonly sourcePrismicClient: prismic.Client,
        private readonly destinationPrismicClient: prismic.Client
    ) {
    }

    /**
     * Détecte si un objet est un FilledContentRelationshipField.
     * Discriminant : link_type === "Document" + id string.
     */
    private isDocumentLink(value: unknown): value is prismic.FilledContentRelationshipField {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
        const v = value as Record<string, unknown>;
        return v['link_type'] === 'Document' && typeof v['id'] === 'string';
    }

    /**
     * Parcourt récursivement doc.data et collecte tous les FilledContentRelationshipField.
     * Déduplique par id.
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
                message: `Document lié absent dans la destination (uid: ${link.uid}, type: ${link.type})`,
                fixable: true,
                fixed: false,
                context: {id: link.id, type: link.type, uid: link.uid},
            });
        }

        return {valid: true, issues};
    }

    async fix(doc: prismic.PrismicDocument, issues: ValidationIssue[]): Promise<prismic.PrismicDocument> {
        // Construire un map uid → nouvel id dans la destination
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
                    issue.fixDescription = `Document lié trouvé dans la destination (id: ${idTarget})`;
                }

            }

            const found = await this.destinationPrismicClient.getByUID(type, uid).catch(() => null);

            if (found) {
                replacements.set(issue.context!['id'] as string, found.id);
                issue.fixed = true;
                issue.fixDescription = `Document lié trouvé dans la destination (id: ${found.id})`;
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
     * Tente de trouver dans la destination un document équivalent au document source identifié par idSource et type.
     * La comparaison se fait via une égalité profonde (lodash.isEqual) entre les deux documents.
     * @param idSource
     * @param type
     * @private
     */
    private async foundIdTargetDocument(idSource: string, type: string): Promise<string | null> {
        const allDocsDestinationType = await this.destinationPrismicClient.getByType(type);
        const sourceDoc = await this.sourcePrismicClient.getByID(idSource).catch(() => null);
        for (const docDest of allDocsDestinationType.results) {
            if (_.isEqual(docDest.data, sourceDoc?.data)) {
                return docDest.id;
            }
        }
        return null;
    }

}
