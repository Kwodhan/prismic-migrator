import { DocumentValidator } from '../DocumentValidator';
import { ValidationResultUtils } from '../ValidationResult';
import * as prismic from '@prismicio/client';
import { PrismicMigratorCustomType } from '../../../custom-type/PrismicMigratorCustomType';
import {ValidationResult} from "@shared/types";

/**
 * Vérifie que le custom type du document existe dans le repository de destination.
 * BLOCKING : la Migration API refusera la création si le type est absent.
 */
export class CustomTypeValidator implements DocumentValidator {
    constructor(
        private readonly prismicMigratorCustomType: PrismicMigratorCustomType,
    ) {}

    async validate(doc: prismic.PrismicDocument): Promise<ValidationResult> {
        const customType = await this.prismicMigratorCustomType.getTargetCustomTypeById(doc.type);

        if (!customType) {
            return {
                valid: false,
                issues: [{
                    severity: 'BLOCKING',
                    code: 'CUSTOM_TYPE_NOT_FOUND',
                    validator: this.constructor.name,
                    message: `Le custom type "${doc.type}" n'existe pas dans le repository de destination`,
                    fixable: false,
                }],
            };
        }

        return ValidationResultUtils.ok();
    }
}
