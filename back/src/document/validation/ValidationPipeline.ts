import {DocumentValidator} from './DocumentValidator';
import { ValidationResultUtils} from './ValidationResult';
import * as prismic from '@prismicio/client';
import {ValidationResult} from "@shared/types";

/**
 * Runs all validators in parallel and merges their results.
 * If a BLOCKING issue is found, migration must not start.
 */
export class ValidationPipeline {
    private readonly validators: DocumentValidator[];

    constructor(validators: DocumentValidator[]) {
        this.validators = validators;
    }

    async run(doc: prismic.PrismicDocument): Promise<ValidationResult> {
        const results = await Promise.all(
            this.validators.map(v => v.validate(doc))
        );
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
        const initialResult = await this.run(doc);

        let fixedDoc = doc;
        for (const validator of this.validators) {
            if (validator.fix) {
                const validatorIssues = initialResult.issues.filter(i => i.validator === validator.constructor.name);
                fixedDoc = await validator.fix(fixedDoc, validatorIssues);
            }
        }

        const reValidation = await this.run(fixedDoc);
        const result: ValidationResult = {
            valid: reValidation.valid,
            issues: initialResult.issues, // original issues mutated with fixed/fixDescription
        };
        return { result, doc: fixedDoc };
    }
}
