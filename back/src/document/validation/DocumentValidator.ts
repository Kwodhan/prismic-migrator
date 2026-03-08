
import * as prismic from '@prismicio/client';
import {ValidationIssue, ValidationResult} from "@shared/types";

export interface DocumentValidator {
  validate(doc: prismic.PrismicDocument): Promise<ValidationResult>;
  fix?(doc: prismic.PrismicDocument, issues: ValidationIssue[]): Promise<prismic.PrismicDocument>;
}

