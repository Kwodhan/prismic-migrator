import {DocumentValidator} from '../DocumentValidator';
import {ValidationResultUtils} from '../ValidationResult';
import * as prismic from '@prismicio/client';
import {PrismicMigratorCustomType} from '../../../custom-type/PrismicMigratorCustomType';
import {ValidationResult} from "@shared/types";

/**
 * Checks that the custom type of the document exists in the target repository.
 * BLOCKING: the Migration API will refuse creation if the type is missing.
 */
export class CustomTypeValidator implements DocumentValidator {
  constructor(
    private readonly repoNameTarget: string,
    private readonly prismicMigratorCustomType: PrismicMigratorCustomType,
  ) {
  }

  async validate(doc: prismic.PrismicDocument): Promise<ValidationResult> {
    const customType = await this.prismicMigratorCustomType.getCustomTypeById(this.repoNameTarget,doc.type);

    if (!customType) {
      return {
        valid: false,
        issues: [{
          severity: 'BLOCKING',
          code: 'CUSTOM_TYPE_NOT_FOUND',
          validator: this.constructor.name,
          message: `The custom type "${doc.type}" does not exist in the target repository`,
          fixable: false,
        }],
      };
    }

    return ValidationResultUtils.ok();
  }
}
