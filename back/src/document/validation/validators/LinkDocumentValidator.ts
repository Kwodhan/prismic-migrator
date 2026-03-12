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
                message: `Linked document missing in destination (uid: ${link.uid}, type: ${link.type})`,
                fixable: true,
                fixed: false,
                urlHint: `https://${this.sourcePrismicClient.repositoryName}.prismic.io/builder/pages/${link.id}`,
                context: {id: link.id, type: link.type, uid: link.uid},
            });
        }

        return {valid: true, issues};
    }

    async fix(doc: prismic.PrismicDocument, issues: ValidationIssue[]): Promise<prismic.PrismicDocument> {
        // Build a map uid -> new id in destination
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
                    issue.fixDescription = `Linked document found in destination (id: ${idTarget})`;
                }

            }

            const found = await this.destinationPrismicClient.getByUID(type, uid).catch(() => null);

            if (found) {
                replacements.set(issue.context!['id'] as string, found.id);
                issue.fixed = true;
                issue.fixDescription = `Linked document found in destination (id: ${found.id})`;
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
     * Attempt to find in the destination a document equivalent to the source document identified by idSource and type.
     * Comparison uses deep equality (lodash.isEqual) between the two documents.
     * @param idSource
     * @param type
     * @private
     */
    private async foundIdTargetDocument(idSource: string, type: string): Promise<string | null> {
        // TODO :  Give the first 100 documents of the relevant type, need to implement pagination if there are more than 100 documents of the same type in the destination
        const allDocsDestinationType = await this.destinationPrismicClient.getByType(type);
        let docSource = await this.sourcePrismicClient.getByID(idSource).catch(() => null);
        if (!docSource) {
            return null;
        }
        let cleanDocSource = this.removeKeyDeep(docSource.data, 'id');
        cleanDocSource = this.removeKeyDeep(cleanDocSource, 'key');
        for (const docDest of allDocsDestinationType.results) {
            let cleanDocDest = this.removeKeyDeep(docDest.data, 'id');
            cleanDocDest = this.removeKeyDeep(cleanDocDest, 'key');
            if (_.isEqual(cleanDocDest, cleanDocSource)) {
                return docDest.id;
            }
        }
        return null;
    }


    /**
     * Recursively remove a key from an object or array.
     * @param obj
     * @param keyToRemove
     * @private
     */
    private removeKeyDeep<T = unknown>(obj: T, keyToRemove: string): T {
        if (obj == null) return obj;

        if (Array.isArray(obj)) {
            return (obj as unknown as any[]).map(item => this.removeKeyDeep(item, keyToRemove)) as unknown as T;
        }

        if (_.isPlainObject(obj)) {
            const result = _.transform(
                obj as Record<string, unknown>,
                (acc: Record<string, unknown>, value, key) => {
                    if (key === keyToRemove) return;
                    acc[key] = this.removeKeyDeep(value, keyToRemove);
                },
                {}
            );
            return result as unknown as T;
        }

        return obj;
    }
}
