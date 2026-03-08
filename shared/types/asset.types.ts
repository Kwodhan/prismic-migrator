export interface AssetFile {
  id: string;
  url: string;
  filename: string;
  kind: string;
  height: number;
  width: number;
  alt?: string | null;
}

export interface AssetMigrationResult {
  success: boolean;
  assetId?: string;
  filename?: string;
  error?: string;
}

