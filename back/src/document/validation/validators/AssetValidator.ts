import {DocumentValidator} from '../DocumentValidator';
import {ValidationResultUtils} from '../ValidationResult';
import * as prismic from '@prismicio/client';
import {FilledImageFieldImage} from '@prismicio/client';
import {PrismicMigratorAssets} from "../../../asset/PrismicMigratorAssets";
import {ValidationIssue, ValidationResult} from "@shared/types";

/**
 * Parcourt récursivement les champs du document à la recherche de références
 * vers des assets (images, link to media) et vérifie leur existence dans la destination.
 *
 * WARNING : la migration peut réussir mais les champs image seront vides.
 *
 * FIX : télécharge chaque asset manquant depuis son URL source et l'uploade
 *       vers https://asset-api.prismic.io/assets de la destination,
 *       puis remplace les URLs dans le document par celles des nouveaux assets.
 */
export class AssetValidator implements DocumentValidator {
    constructor(
        private readonly repoNameSource: string,
        private readonly repoNameTarget: string,
        private readonly prismicMigratorAssets: PrismicMigratorAssets,
    ) {
    }

    /**
     * Détecte si un objet est un FilledImageFieldImage Prismic.
     * Discriminant : présence de url (string), id (string) et dimensions.width/height (number).
     */
    private isImageField(value: unknown): value is prismic.FilledImageFieldImage {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
        const v = value as Record<string, unknown>;
        return (
            typeof v['url'] === 'string' &&
            typeof v['id'] === 'string' &&
            typeof v['dimensions'] === 'object' &&
            v['dimensions'] !== null &&
            typeof (v['dimensions'] as Record<string, unknown>)['width'] === 'number' &&
            typeof (v['dimensions'] as Record<string, unknown>)['height'] === 'number'
        );
    }

    /**
     * Détecte si un noeud est un RTImageNode dans un richText.
     * Discriminant : type === 'image' + id + url + dimensions.
     */
    private isRichTextImageNode(node: unknown): node is prismic.RTImageNode {
        if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
        const n = node as Record<string, unknown>;
        return (
            n['type'] === 'image' &&
            typeof n['id'] === 'string' &&
            typeof n['url'] === 'string' &&
            typeof n['dimensions'] === 'object' &&
            n['dimensions'] !== null
        );
    }

    /**
     * Parcourt un tableau de noeuds richText et collecte les RTImageNode.
     */
    private extractImagesFromRichText(nodes: unknown[]): prismic.FilledImageFieldImage[] {
        const found: prismic.FilledImageFieldImage[] = [];
        for (const node of nodes) {
            if (this.isRichTextImageNode(node)) {
                found.push(node as unknown as prismic.FilledImageFieldImage);
            }
        }
        return found;
    }

    /**
     * Parcourt récursivement les données du document et collecte toutes les images.
     * Traite maintenant aussi les richText au lieu de les ignorer.
     */
    private extractImages(data: unknown, found: prismic.FilledImageFieldImage[] = []): prismic.FilledImageFieldImage[] {
        if (!data || typeof data !== 'object') return found;

        if (Array.isArray(data)) {
            // RichText : tableau dont le premier élément a un champ "type" string
            if (data.length > 0 && typeof (data[0] as Record<string, unknown>)['type'] === 'string') {
                found.push(...this.extractImagesFromRichText(data));
                return found;
            }
            for (const item of data) {
                this.extractImages(item, found);
            }
            return found;
        }

        const obj = data as Record<string, unknown>;
        for (const key of Object.keys(obj)) {
            const value = obj[key];
            if (this.isImageField(value)) {
                // Create a copy of the image without the thumbnail keys before pushing
                const imageOnly = Object.fromEntries(
                    Object.entries(value as unknown as Record<string, unknown>)
                        .filter(([, v]) => !this.isImageField(v))
                ) as unknown as prismic.FilledImageFieldImage;
                found.push(imageOnly);

                // Collect thumbnails separately
                for (const thumbKey of Object.keys(value as object)) {
                    const thumb = (value as unknown as Record<string, unknown>)[thumbKey];
                    if (this.isImageField(thumb)) {
                        found.push(thumb);
                    }
                }
            } else {
                this.extractImages(value, found);
            }
        }

        return found;
    }

    async validate(doc: prismic.PrismicDocument): Promise<ValidationResult> {
        const images = this.extractImages(doc.data);

        if (images.length === 0) {
            return ValidationResultUtils.ok();
        }
        const issues: ValidationIssue[] = images.map(img => ({
            severity: 'WARNING',
            code: 'ASSET_NOT_FOUND',
            validator: this.constructor.name,
            message: `Asset "${img.url}" non trouvé dans la destination `,
            fixable: true,
            fixed: false,
            urlHint: img.url,
            context: {id: img.id, url: img.url},
        }));

        return {valid: false, issues};
    }

    /**
     * Cherche dans les assets du repository de destination un asset dont l'URL
     * contient le même nom de fichier que l'asset source.
     *
     * Format URL source : https://images.prismic.io/${repository}/${id}_${nom}.ext
     * On extrait ${nom} et on cherche une URL target qui le contient via regex.
     *
     * @returns l'URL de l'asset trouvé dans la destination, ou null si absent
     */
    private async findMatchingAssetUrl(id: string, node: FilledImageFieldImage): Promise<FilledImageFieldImage | null> {
        // 1. Chercher les infos de l'image source à partir de son id
        const sourceAssets = await this.prismicMigratorAssets.getAssets(this.repoNameSource);
        const sourceAsset = sourceAssets.find(a => a.id === id);
        if (!sourceAsset) return null;

        // 2. Récupérer le filename
        const filename = sourceAsset.filename;

        // 3. Chercher dans les assets target un fichier avec ce nom
        const targetAssets = await this.prismicMigratorAssets.getAssets(this.repoNameTarget);
        const match = targetAssets.find(a => a.filename === filename);

        // 4 & 5. Si trouvé, construire et retourner le FilledImageFieldImage
        if (match) {
            const newUrl = match.url + node.url.replaceAll(sourceAsset.url, '');
            return {
                id: match.id,
                url: newUrl,
                dimensions: node.dimensions,
                edit: node.edit,
                alt: node.alt,
                copyright: node.copyright,
            };
        }

        // 6. Pas trouvé
        return null;
    }

    private async updateImages(data: unknown, issues: ValidationIssue[]): Promise<unknown> {
        const idsToFix = new Set<string>(
            issues
                .filter(i => i.code === 'ASSET_NOT_FOUND' && i.context?.['id'])
                .map(i => i.context!['id'] as string)
        );
        if (idsToFix.size === 0) return data;
        if (!data || typeof data !== 'object') return data;

        if (Array.isArray(data)) {
            // RichText : traiter chaque noeud individuellement pour mettre à jour les RTImageNode
            if (data.length > 0 && typeof (data[0] as Record<string, unknown>)['type'] === 'string') {
                return Promise.all(data.map(async node => {
                    if (this.isRichTextImageNode(node) && idsToFix.has(node.id)) {
                        const targetAsset = await this.findMatchingAssetUrl(node.id, node);
                        if (targetAsset) {
                            const issue = issues.find(i => i.context?.['url'] === node.url);
                            if (issue) {
                                issue.fixDescription = `Asset trouvé : "${targetAsset.url}"`;
                                issue.fixed = true;
                            }
                            return {
                                ...node,
                                id: targetAsset.id,
                                url: targetAsset.url,
                                dimensions: targetAsset.dimensions
                            };
                        }
                    }
                    return node;
                }));
            }
            return Promise.all(data.map(item => this.updateImages(item, issues)));
        }

        if (this.isImageField(data)) {
            const img = data;
            let result: Record<string, unknown> = {};
            // Traiter l'image principale
            if (idsToFix.has(img.id)) {
                const targetAsset = await this.findMatchingAssetUrl(img.id, img);
                if (targetAsset) {
                    const issue = issues.find(i => i.context?.['url'] === img.url);
                    if (issue) {
                        issue.fixDescription = `Asset trouvé : "${targetAsset.url}"`;
                        issue.fixed = true;
                    }
                    result = {...(targetAsset as unknown as Record<string, unknown>)};
                }

                for (const thumbKey of Object.keys(img as unknown as Record<string, unknown>)) {
                    const thumb = (img as unknown as Record<string, unknown>)[thumbKey];
                    if (this.isImageField(thumb)) {
                        result[thumbKey] = await this.updateImages(thumb, issues);
                    }
                }
            }
            return result;
        }

        const obj = data as Record<string, unknown>;
        const result: Record<string, unknown> = {};
        for (const key of Object.keys(obj)) {
            result[key] = await this.updateImages(obj[key], issues);
        }
        return result;
    }

    async fix(doc: prismic.PrismicDocument, issues: ValidationIssue[]): Promise<prismic.PrismicDocument> {
        const data = await this.updateImages(doc.data, issues) as Record<string, unknown>;
        return {
            ...doc,
            data
        };
    }
}
