export interface CustomType {
  id: string;
  label: string;
  repeatable: boolean;
  json: Record<string, unknown>;
  status: boolean;
}

export interface CustomTypeMigrationResult {
  success: boolean;
  source?: CustomType;
  target?: CustomType;
  error?: string;
}

