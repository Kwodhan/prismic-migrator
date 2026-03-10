import axios, {AxiosInstance} from 'axios';
import FormData from 'form-data';
import {AssetFile, AssetMigrationResult} from "@shared/types";

export class PrismicMigratorAssets {
  private readonly sourceRepositoryName: string;
  private readonly sourceToken: string;
  private readonly destinationRepository: string;
  private readonly destinationToken: string;
  private readonly axiosInstance: AxiosInstance;

  constructor(sourceRepositoryName: string, sourceToken: string, destinationRepository: string, destinationToken: string, axiosInstance: AxiosInstance) {
    this.sourceRepositoryName = sourceRepositoryName;
    this.sourceToken = sourceToken;
    this.destinationRepository = destinationRepository;
    this.destinationToken = destinationToken;
    this.axiosInstance = axiosInstance;
  }

  /**
   * Private helper to fetch assets from a repository
   */
  private async fetchAssets(repositoryName: string, token: string): Promise<AssetFile[]> {
    const assets: AssetFile[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const {data} = await this.axiosInstance.get<{ items: AssetFile[]; total: number }>(
        `https://asset-api.prismic.io/assets`,
        {
          params: {limit: 99999},
          headers: {
            Authorization: `Bearer ${token}`,
            repository: repositoryName,
          },
        }
      ).catch(error => {
        if (axios.isAxiosError(error)) {
          console.error(`[fetchAssets] ${error.response?.status}`, JSON.stringify(error.response?.data, null, 2));
        }
        throw error;
      });

      assets.push(...data.items);
      hasMore = assets.length < data.total;
      page++;
    }

    return assets;
  }

  /**
   * Retrieve all assets from the source repository
   */
  async getSourceAssets(): Promise<AssetFile[]> {
    return this.fetchAssets(this.sourceRepositoryName, this.sourceToken);
  }

  /**
   * Retrieve all assets from the target repository
   */
  async getTargetAssets(): Promise<AssetFile[]> {
    return this.fetchAssets(this.destinationRepository, this.destinationToken);
  }

  /**
   * Migrate an asset from a source URL to the destination repository
   * @param sourceUrl - Source asset URL to migrate
   * @param filename - Optional filename
   */
  async migrateAsset(
    sourceUrl: string,
    filename?: string
  ): Promise<AssetMigrationResult> {
    const {destinationRepository, destinationToken} = this;

    try {
      // 1. Download the asset from the source URL
      const assetResponse = await this.axiosInstance.get<Buffer>(sourceUrl, {
        responseType: 'arraybuffer',
      });

      const buffer = Buffer.from(assetResponse.data);

      // Infer filename from URL if not provided
      const resolvedFilename = filename ?? sourceUrl.split('/').pop() ?? 'asset';

      // 2. Check if an asset with the same filename already exists in the target repo
      const targetAssets = await this.getTargetAssets();
      const alreadyExists = targetAssets.some(asset => asset.filename === resolvedFilename);

      if (alreadyExists) {
        return {
          success: false,
          filename: resolvedFilename,
          error: `An asset with the name "${resolvedFilename}" already exists in the destination repository`,
        };
      }

      // 2. Upload the asset to the destination repository via the Asset API
      const formData = new FormData();
      formData.append('file', buffer, resolvedFilename);

      const {data: uploaded} = await this.axiosInstance.post<{ id: string; url: string; filename: string }>(
        `https://asset-api.prismic.io/assets`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${destinationToken}`,
            repository: destinationRepository,
            ...formData.getHeaders(),
          },
        }
      );

      return {
        success: true,
        assetId: uploaded.id,
        filename: uploaded.filename,
      };
    } catch (error) {
      return {
        success: false,
        error: axios.isAxiosError(error)
          ? `${error.response?.status} - ${JSON.stringify(error.response?.data)}`
          : String(error),
      };
    }
  }

}
