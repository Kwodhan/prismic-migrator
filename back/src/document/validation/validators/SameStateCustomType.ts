import {DocumentValidator} from "../DocumentValidator";
import {PrismicMigratorCustomType} from "../../../custom-type/PrismicMigratorCustomType";
import {diff} from 'deep-object-diff';
import {ValidationResult} from "@shared/types";
import {ValidationResultUtils} from "../ValidationResult";
import * as prismic from "@prismicio/client";


export class SameStateCustomType implements DocumentValidator {
  constructor(
    private readonly repoNameSource: string,
    private readonly repoNameTarget: string,
    private readonly prismicMigratorCustomType: PrismicMigratorCustomType,
  ) {
  }


  async validate(doc: prismic.PrismicDocument): Promise<ValidationResult> {
    const customTypeSource = await this.prismicMigratorCustomType.getCustomTypeById(this.repoNameSource, doc.type);
    const customTypeTarget = await this.prismicMigratorCustomType.getCustomTypeById(this.repoNameTarget, doc.type);

    if (!customTypeTarget || !customTypeSource) {
      return ValidationResultUtils.ok();
    }
    const diffResult = diff(customTypeSource, customTypeTarget);
    if (Object.keys(diffResult).length === 0) {
      return ValidationResultUtils.ok();
    }
    return {
      valid: false,
      issues: [{
        severity: 'BLOCKING',
        code: 'CUSTOM_TYPE_NOT_SAME',
        validator: this.constructor.name,
        message: `Le customType ${doc.type} est différent entre la source et la destination`,
        fixable: false,
      }],
    };

  }


}
