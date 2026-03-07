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
  valid: boolean;       // false si au moins un BLOCKING
  issues: ValidationIssue[];
}

export const ValidationResult = {
  ok(): ValidationResult {
    return { valid: true, issues: [] };
  },
  merge(...results: ValidationResult[]): ValidationResult {
    const issues = results.flatMap(r => r.issues);
    return {
      valid: issues.every(i => i.severity !== 'BLOCKING'),
      issues,
    };
  },
};

