import {DocumentValidator} from './DocumentValidator';
import * as prismic from '@prismicio/client';
import {ValidationResult} from "@shared/types";
import {ValidationResultUtils} from './ValidationResult';


/**
 * Runs all validators in parallel and merges their results.
 * If a BLOCKING issue is found, migration must not start.
 */
export class ValidationPipeline {
  constructor(private readonly validators: DocumentValidator[]) {
  }

  async run(doc: prismic.PrismicDocument): Promise<ValidationResult> {
    const results = await Promise.all(this.validators.map(v => v.validate(doc)));
    return ValidationResultUtils.merge(...results);
  }

  /**
   * Applies each validator fix sequentially when available,
   * then re-validates the corrected document.
   * Returns the final validation result and the potentially modified document.
   */
  async runWithFix(doc: prismic.PrismicDocument): Promise<{
    result: ValidationResult;
    doc: prismic.PrismicDocument
  }> {
    // Run all validators in parallel once, keeping individual results tied to their validator
    const validatorResults = await Promise.all(
      this.validators.map(async v => ({validator: v, result: await v.validate(doc)}))
    );

    const initialResult = ValidationResultUtils.merge(...validatorResults.map(vr => vr.result));


    const fixable = validatorResults.filter(vr => vr.validator.fix && vr.result.issues.length > 0);

    if (fixable.length === 0) {
      return {result: initialResult, doc};
    }

    // Issues are taken directly from each validator's own result
    let fixedDoc = doc;
    for (const {validator, result} of fixable) {
      fixedDoc = await validator.fix!(fixedDoc, result.issues);
    }

    const reValidation = await this.run(fixedDoc);
    return {
      result: {...reValidation, issues: initialResult.issues}, // original issues kept for traceability (fixed/fixDescription)
      doc: fixedDoc,
    };
  }
}
