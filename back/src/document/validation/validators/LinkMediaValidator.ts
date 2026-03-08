import {DocumentValidator} from '../DocumentValidator';
import {ValidationResultUtils} from '../ValidationResult';
import * as prismic from '@prismicio/client';
import {PrismicMigratorAssets} from '../../../asset/PrismicMigratorAssets';
import {ValidationIssue, ValidationResult} from "@shared/types";


export class LinkMediaValidator implements DocumentValidator {
    constructor(
        private readonly prismicMigratorAssets: PrismicMigratorAssets,
    ) {
    }


    private isMediaLink(value: unknown): value is prismic.FilledLinkToMediaField {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
        const v = value as Record<string, unknown>;
        return v['link_type'] === 'Media' && typeof v['id'] === 'string' && typeof v['url'] === 'string';
    }

    private extractMediaLinks(data: unknown, found: Map<string, prismic.FilledLinkToMediaField> = new Map()): Map<string, prismic.FilledLinkToMediaField> {
        if (!data || typeof data !== 'object') return found;

        if (Array.isArray(data)) {
            for (const item of data) {
                this.extractMediaLinks(item, found);
            }
            return found;
        }

        const obj = data as Record<string, unknown>;
        for (const key of Object.keys(obj)) {
            const value = obj[key];
            if (this.isMediaLink(value)) {
                found.set(value.id, value);
            } else {
                this.extractMediaLinks(value, found);
            }
        }

        return found;
    }

    async validate(doc: prismic.PrismicDocument): Promise<ValidationResult> {
        const links = this.extractMediaLinks(doc.data);

        if (links.size === 0) return ValidationResultUtils.ok();

        const targetAssets = await this.prismicMigratorAssets.getTargetAssets();
        const targetFileName = new Set(targetAssets.map(a => a.filename));

        const issues: ValidationIssue[] = [];

        for (const link of links.values()) {
            if (!targetFileName.has(link.name)) {
                issues.push({
                    severity: 'WARNING',
                    code: 'LINKED_MEDIA_NOT_FOUND',
                    validator: this.constructor.name,
                    message: `Media lié absent dans la destination (id: ${link.id}, nom: ${link.name})`,
                    fixable: true,
                    context: {id: link.id, url: link.url, name: link.name, kind: link.kind},
                });
            }
        }

        return {valid: true, issues};
    }

    async fix(doc: prismic.PrismicDocument, issues: ValidationIssue[]): Promise<prismic.PrismicDocument> {
        const targetAssets = await this.prismicMigratorAssets.getTargetAssets();

        const replacements = new Map<string, typeof targetAssets[0] | null>();
        for (const issue of issues) {
            const name = issue.context?.['name'] as string | undefined;
            const id = issue.context?.['id'] as string | undefined;
            if (!name || !id) continue;

            const match = targetAssets.find(a => a.filename === name);
            if (match) {
                replacements.set(id, match);
                issue.fixed = true;
                issue.fixDescription = `Media trouvé dans la destination : "${match.filename}"`;
            } else {
                replacements.set(id, null); // non trouvé → sera mis à vide
            }
        }

        if (replacements.size === 0) return doc;

        return {
            ...doc,
            data: this.replaceMediaLinks(doc.data, replacements) as Record<string, unknown>,
        };
    }

    private replaceMediaLinks(data: unknown, replacements: Map<string, { id: string; url: string; filename: string; kind: string } | null>): unknown {
        if (!data || typeof data !== 'object') return data;

        if (Array.isArray(data)) {
            return data.map(item => this.replaceMediaLinks(item, replacements));
        }

        if (this.isMediaLink(data)) {
            if (!replacements.has(data.id)) return data; // non concerné
            const match = replacements.get(data.id);
            if (match) {
                return { ...data, id: match.id, url: match.url, name: match.filename, kind: match.kind };
            }
            return { link_type: 'Any' }; // non trouvé → vide
        }

        const obj = data as Record<string, unknown>;
        const result: Record<string, unknown> = {};
        for (const key of Object.keys(obj)) {
            result[key] = this.replaceMediaLinks(obj[key], replacements);
        }
        return result;
    }
}
