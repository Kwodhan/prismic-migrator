import {DocumentValidator} from "../DocumentValidator";
import {ValidationResultUtils} from "../ValidationResult";
import {ValidationResult} from "@shared/types";
import * as prismic from "@prismicio/client";
import _ from 'lodash';
import {CachedPrismicClient} from "../CachedPrismicClient";


/**
 * Some documents do not have a uid, making it difficult to know whether an equivalent document already exists in the target.
 * This validation attempts a deep comparison between the source document and documents of the same type in the target
 * to verify that no equivalent document already exists.
 * BLOCKING: the Migration API will refuse creation if an identical document exists.
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
                            message: `A document already exists in the target repository with exactly the same content (id: ${docDest.id})`,
                            fixable: false,
                        }],
                    };
                }
            }
        }
        return ValidationResultUtils.ok();
    }
}
