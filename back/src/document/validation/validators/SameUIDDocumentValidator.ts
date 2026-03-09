import {DocumentValidator} from "../DocumentValidator";
import {ValidationResultUtils} from "../ValidationResult";
import {ValidationResult} from "@shared/types";
import * as prismic from "@prismicio/client";


/** * Vérifie qu'aucun document avec le même uid n'existe déjà dans le repository de destination.
 * BLOCKING : la Migration refusera la création s'il existe déjà un document avec le même uid.
 */
export class SameUIDDocumentValidator implements DocumentValidator {
    constructor(
        private readonly destinationPrismicClient: prismic.Client
    ) {
    }

    async validate(doc: prismic.PrismicDocument): Promise<ValidationResult> {
        if (doc.uid) {
            const found = await this.destinationPrismicClient.getByUID(doc.type, doc.uid).catch(() => null);
            if (found) {
                return {
                    valid: false,
                    issues: [{
                        severity: 'BLOCKING',
                        code: 'DOCUMENT_ALREADY_EXISTS',
                        validator: this.constructor.name,
                        message: `Un document existe déja dans le repertoire de destination avec le même uid (uid: ${doc.uid})`,
                        fixable: false,
                    }],
                };
            }
        }
        return ValidationResultUtils.ok();
    }
}