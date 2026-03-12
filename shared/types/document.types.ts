import { ValidationResult } from './validation.types';

export interface PrismicDocument {
  id: string;
  uid: string | null;
  title: string;
  type: string;
  url: string | null;
  first_publication_date: string | null;
  last_publication_date: string | null;
}

export interface PaginatedDocuments {
  documents: PrismicDocument[];
  page: number;
  totalPages: number;
  totalDocuments: number;
}

export interface ReportMigrationResult {
  validation: ValidationResult;
}

export interface DocumentMigrationResult extends ReportMigrationResult{
  success: boolean;
  id: string| null;
  error: string | null;
}

