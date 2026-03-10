import {DocumentValidator} from "../DocumentValidator";
import {ValidationResultUtils} from "../ValidationResult";
import {ValidationResult} from "@shared/types";
import * as prismic from "@prismicio/client";


/**
 * Ensure no document with the same uid already exists in the destination repository.
 * BLOCKING: Migration will refuse creation if a document with the same uid already exists.
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
                        message: `A document already exists in the destination repository with the same uid (uid: ${doc.uid})`,
                        fixable: false,
                    }],
                };
            }
        }
        return ValidationResultUtils.ok();
    }
}