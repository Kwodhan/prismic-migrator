import {DocumentValidator} from '../DocumentValidator';
import { ValidationResultUtils} from '../ValidationResult';
import * as prismic from '@prismicio/client';
import {ValidationIssue, ValidationResult} from "@shared/types";


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

            const uid = issue.context?.['uid'] as string | undefined;
            const type = issue.context?.['type'] as string | undefined;
            if (!uid || !type) continue;

            try {

                const found = await this.destinationPrismicClient.getByUID(type, uid);

                replacements.set(issue.context!['id'] as string, found.id);
                issue.fixed = true;
                issue.fixDescription = `Document lié trouvé dans la destination (id: ${found.id})`;
            } catch {
                // Pas trouvé → on laisse inchangé
            }
        }

        if (replacements.size === 0) return doc;

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
}
