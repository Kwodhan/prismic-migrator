import {DocumentValidator} from './DocumentValidator';
import {ValidationResult} from './ValidationResult';
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
     * car le fix peut justement résoudre le BLOCKING.
     * Retourne la validation finale + le document potentiellement modifié.
     */
    async runWithFix(doc: prismic.PrismicDocument): Promise<{
        result: ValidationResult;
        doc: prismic.PrismicDocument
    }> {
        // Validation initiale pour collecter les issues
        const initialResult = await this.run(doc);

        let fixedDoc = doc;
        for (const validator of this.validators) {
            if (validator.fix) {
                const validatorIssues = initialResult.issues.filter(i => i.validator === validator.constructor.name);
                fixedDoc = await validator.fix(fixedDoc, validatorIssues);
            }
        }

        // Re-valider après les fix pour savoir si des BLOCKING subsistent
        const reValidation = await this.run(fixedDoc);
        const result: ValidationResult = {
            valid: reValidation.valid,
            issues: initialResult.issues, // issues originales mutées avec fixed/fixDescription
        };
        return { result, doc: fixedDoc };
    }
}

