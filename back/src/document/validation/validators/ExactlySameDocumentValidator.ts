import {DocumentValidator} from "../DocumentValidator";
import {ValidationResultUtils} from "../ValidationResult";
import {ValidationResult} from "@shared/types";
import * as prismic from "@prismicio/client";
import _ from 'lodash';
import {CachedPrismicClient} from "../CachedPrismicClient";


/**
 * Certains documents ne possèdent pas d'uid, il est donc difficile de savoir s'il existe déjà un document équivalent dans la destination.
 * Cette validation tente de faire une comparaison profonde entre le document source et les documents de même type dans la destination
 * pour vérifier qu'il n'existe pas déjà un document équivalent.
 * BLOCKING : la Migration API refusera la création s'il y a exactement le même document.
 */
export class ExactlySameDocumentValidator implements DocumentValidator {
    constructor(
        private readonly sourcePrismicClient: CachedPrismicClient,
        private readonly destinationPrismicClient: CachedPrismicClient
    ) {
    }

    async validate(doc: prismic.PrismicDocument): Promise<ValidationResult> {
        if (!doc.uid) {
            const allDocsDestinationType = await this.destinationPrismicClient.getByType(doc.type);
            const sourceDoc = await this.sourcePrismicClient.getByID(doc.id).catch(() => null);
            for (const docDest of allDocsDestinationType) {
                if (_.isEqual(docDest.data, sourceDoc?.data)) {
                    return {
                        valid: false,
                        issues: [{
                            severity: 'BLOCKING',
                            code: 'DOCUMENT_ALREADY_EXISTS',
                            validator: this.constructor.name,
                            message: `Un document existe déja dans le repertoire de destination avec exactement le même contenu (id: ${docDest.id})`,
                            fixable: false,
                        }],
                    };
                }
            }
        }
        return ValidationResultUtils.ok();
    }
}