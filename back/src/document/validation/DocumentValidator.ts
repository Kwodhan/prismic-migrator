import { ValidationIssue, ValidationResult } from './ValidationResult';
import * as prismic from '@prismicio/client';

export interface DocumentValidator {
  validate(doc: prismic.PrismicDocument): Promise<ValidationResult>;
  fix?(doc: prismic.PrismicDocument, issues: ValidationIssue[]): Promise<prismic.PrismicDocument>;
}

