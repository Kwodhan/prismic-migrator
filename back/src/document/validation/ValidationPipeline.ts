import {DocumentValidator} from './DocumentValidator';
import * as prismic from '@prismicio/client';
import {ValidationResult} from "@shared/types";
import {ValidationResultUtils} from './ValidationResult';


/**
 * Runs all validators in parallel and merges their results.
 * If a BLOCKING issue is found, migration must not start.
 */
export class ValidationPipeline {
    constructor(private readonly validators: DocumentValidator[]) {}

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
        const initialResult = await this.run(doc);

        let fixedDoc = doc;
        for (const validator of this.validators) {
            if (validator.fix) {
                const issues = initialResult.issues.filter(i => i.validator === validator.constructor.name);
                fixedDoc = await validator.fix(fixedDoc, issues);
            }
        }

        const reValidation = await this.run(fixedDoc);
        return {
            result: { ...reValidation, issues: initialResult.issues }, // original issues mutated with fixed/fixDescription
            doc: fixedDoc,
        };
    }
}
