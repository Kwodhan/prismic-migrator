import {DocumentValidator} from '../DocumentValidator';
import {ValidationIssue, ValidationResult} from '../ValidationResult';
import * as prismic from '@prismicio/client';
import {AxiosInstance} from 'axios';

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
        private readonly destinationRepositoryName: string,
        private readonly destinationToken: string,
        private readonly axiosInstance: AxiosInstance,
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
     * Parcourt récursivement les données du document et collecte toutes les images.
     * Ignore les tableaux de noeuds richText (tableaux dont les items ont un champ "type" string).
     */
    private extractImages(data: unknown, found: prismic.FilledImageFieldImage[] = []): prismic.FilledImageFieldImage[] {
        if (!data || typeof data !== 'object') return found;

        if (Array.isArray(data)) {
            // Ignorer les richText : tableau dont le premier élément a un champ "type" string
            if (data.length > 0 && typeof (data[0] as Record<string, unknown>)['type'] === 'string') {
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
                found.push(value);
                // Chercher aussi les thumbnails : autres clés de l'ImageField avec mêmes propriétés
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
            return ValidationResult.ok();
        }
        const issues: ValidationIssue[] = images.map(img => ({
            severity: 'WARNING',
            code: 'ASSET_NOT_FOUND',
            validator: "AssetValidator",
            message: `Asset non vérifié dans la destination : ${img.url}`,
            fixable: true,
            fixDescription: `Trouver l'image dans les assets déja présentes; Si non trouvé alors télécharger et uploader l'asset vers le repository de destination`,
            context: {id: img.id, url: img.url},
        }));

        return {valid: false, issues};
    }

    /**
     * Parcourt récursivement les données et remplace les images dont l'id
     * est dans idsToRemove par un objet image vide.
     */
    private removeImages(data: unknown, idsToRemove: Set<string>): unknown {
        if (!data || typeof data !== 'object') return data;

        if (Array.isArray(data)) {
            // Ignorer les richText
            if (data.length > 0 && typeof (data[0] as Record<string, unknown>)['type'] === 'string') {
                return data;
            }
            return data.map(item => this.removeImages(item, idsToRemove));
        }

        if (this.isImageField(data)) {
            if (idsToRemove.has((data as prismic.FilledImageFieldImage).id)) {
                return {};  // image vide
            }
        }

        const obj = data as Record<string, unknown>;
        const result: Record<string, unknown> = {};
        for (const key of Object.keys(obj)) {
            result[key] = this.removeImages(obj[key], idsToRemove);
        }
        return result;
    }

    async fix(doc: prismic.PrismicDocument, issues: ValidationIssue[]): Promise<prismic.PrismicDocument> {
        const idsToRemove = new Set<string>(
            issues
                .filter(i => i.code === 'ASSET_NOT_FOUND' && i.context?.['id'])
                .map(i => i.context!['id'] as string)
        );

        if (idsToRemove.size === 0) return doc;

        return {
            ...doc,
            data: this.removeImages(doc.data, idsToRemove) as Record<string, unknown>,
        };
    }
}

