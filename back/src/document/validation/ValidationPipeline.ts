import {DocumentValidator} from './DocumentValidator';
import {ValidationIssue, ValidationResult} from './ValidationResult';
import * as prismic from '@prismicio/client';

/**
 * Exécute tous les validators en parallèle et fusionne les résultats.
 * Si un BLOCKING est trouvé, la migration ne doit pas être lancée.
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
        return ValidationResult.merge(...results);
    }

    /**
     * Applique séquentiellement les fix de chaque validator qui en possède un,
     * puis re-valide le document corrigé.
     * Les fix sont tentés même si la première validation avait des BLOCKING,
     * car le fix peut justement résoudre le BLOCKING (ex: CustomTypeValidator).
     * Retourne la validation finale + le document potentiellement modifié.
     */
    async runWithFix(doc: prismic.PrismicDocument, issues: ValidationIssue[]): Promise<{
        result: ValidationResult;
        doc: prismic.PrismicDocument
    }> {
        let fixedDoc = doc;
        for (const validator of this.validators) {
            if (validator.fix) {
                const validatorIssues = issues.filter(i => i.validator === validator.constructor.name);
                fixedDoc = await validator.fix(fixedDoc, validatorIssues);
            }
        }

        const reValidation = await this.run(fixedDoc);
        const result: ValidationResult = {
            valid: reValidation.valid,
            issues,
        };
        return { result, doc: fixedDoc };
    }
}

