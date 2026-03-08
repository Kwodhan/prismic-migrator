import {ValidationResult} from "@shared/types";

export const ValidationResultUtils = {
    ok(): ValidationResult {
        return {valid: true, issues: []};
    },
    merge(...results: ValidationResult[]): ValidationResult {
        const issues = results.flatMap(r => r.issues);
        return {
            valid: issues.every(i => i.severity !== 'BLOCKING'),
            issues,
        };
    },
};
