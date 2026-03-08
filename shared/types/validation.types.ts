export type ValidationSeverity = 'BLOCKING' | 'WARNING';

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  validator: string;
  message: string;
  fixable: boolean;
  fixed?: boolean;
  fixDescription?: string;
  context?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

