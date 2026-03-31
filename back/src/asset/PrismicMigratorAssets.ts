import axios, {AxiosInstance} from 'axios';
import FormData from 'form-data';
import {AssetFile, AssetMigrationResult} from "@shared/types";
import {Environment} from '@shared/types/environment.types';

export class PrismicMigratorAssets {
  private readonly environments: Environment[];
  private readonly axiosInstance: AxiosInstance;

  constructor(environments: Environment[], axiosInstance: AxiosInstance) {
    this.environments = environments;
    this.axiosInstance = axiosInstance;
  }


  /**
   *
   * Retrieve all assets from the repository
   */
  async getAssets(repoName: string): Promise<AssetFile[]> {
    const env = this.environments.find(env => env.repoName === repoName);
    if (!env) {
      return [];
    }
    return this.fetchAssets(env?.repoName, env?.writeToken);
  }

  /**
   * Migrate an asset from a source URL to the destination repository
   @param repoNameTarget - Target repository name to migrate the asset to
   * @param sourceUrl - Source asset URL to migrate
   * @param filename - Optional filename
   */
  async migrateAsset(
    repoNameTarget: string,
    sourceUrl: string,
    filename?: string
  ): Promise<AssetMigrationResult> {
    const envTarget = this.environments.find(env => env.repoName === repoNameTarget);
    if (!envTarget) {
      return {
        success: false,
        error: `Env ${repoNameTarget}  not found`,
      };
    }
    console.log(`[migrateAsset] ${sourceUrl} started`);
    try {
      // 1. Download the asset from the source URL
      const assetResponse = await this.axiosInstance.get<Buffer>(sourceUrl, {
        responseType: 'arraybuffer',
      });

      const buffer = Buffer.from(assetResponse.data);

      // Infer filename from URL if not provided
      const resolvedFilename = filename ?? sourceUrl.split('/').pop() ?? 'asset';

      // 2. Check if an asset with the same filename already exists in the target repo
      const targetAssets = await this.getAssets(repoNameTarget);
      const alreadyExists = targetAssets.some(asset => asset.filename === resolvedFilename);

      if (alreadyExists) {
        console.log(`[migrateAsset] ${sourceUrl} already exists`);
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
            Authorization: `Bearer ${envTarget.writeToken}`,
            repository: envTarget.repoName,
            ...formData.getHeaders(),
          },
        }
      );
      console.log(`[migrateAsset] ${sourceUrl} successfully uploaded`);
      return {
        success: true,
        assetId: uploaded.id,
        filename: uploaded.filename,
      };
    } catch (error) {
      console.log(`[migrateAsset] ${sourceUrl} failed`);
      return {
        success: false,
        error: axios.isAxiosError(error)
          ? `${error.response?.status} - ${JSON.stringify(error.response?.data)}`
          : String(error),
      };
    }
  }

  /**
   * Private helper to fetch assets from a repository
   */
  private async fetchAssets(repositoryName: string, token: string): Promise<AssetFile[]> {
    const assets: AssetFile[] = [];
    let hasMore = true;
    let cursor = '';
    console.log(`[fetchAssets] on ${repositoryName}`);
    while (hasMore) {
      const {data} = await this.axiosInstance.get<{ items: AssetFile[]; total: number; cursor: string; }>(
        `https://asset-api.prismic.io/assets`,
        {
          params: {limit: 99999, cursor: cursor},
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
      cursor = data.cursor;

    }

    return assets;
  }

}
