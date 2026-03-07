import axios, {AxiosInstance} from 'axios';
import FormData from 'form-data';


interface AssetFile {
  id: string;
  url: string;
  filename: string;
  kind: string;
}

interface MigrationResult {
  success: boolean;
  assetId?: string;
  filename?: string;
  error?: string;
}

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
   * Méthode privée commune pour récupérer les assets d'un repository
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
   * Récupère tous les assets du repository source
   */
  async getSourceAssets(): Promise<AssetFile[]> {
    return this.fetchAssets(this.sourceRepositoryName, this.sourceToken);
  }

  /**
   * Récupère tous les assets du repository de destination
   */
  async getTargetAssets(): Promise<AssetFile[]> {
    return this.fetchAssets(this.destinationRepository, this.destinationToken);
  }

  /**
   * Migre un asset depuis une URL source vers le repository de destination
   * @param sourceUrl - URL de l'asset source à migrer
   * @param filename - Nom du fichier (optionnel)
   */
  async migrateAsset(
    sourceUrl: string,
    filename?: string
  ): Promise<MigrationResult> {
    const {destinationRepository, destinationToken} = this;

    try {
      // 1. Télécharger l'asset depuis l'URL source
      const assetResponse = await this.axiosInstance.get<Buffer>(sourceUrl, {
        responseType: 'arraybuffer',
      });

      const buffer = Buffer.from(assetResponse.data);

      // Déduire le nom de fichier depuis l'URL si non fourni
      const resolvedFilename = filename ?? sourceUrl.split('/').pop() ?? 'asset';

      // 2. Vérifier si un asset avec le même nom existe déjà dans le repo cible
      const targetAssets = await this.getTargetAssets();
      const alreadyExists = targetAssets.some(asset => asset.filename === resolvedFilename);

      if (alreadyExists) {
        return {
          success: false,
          filename: resolvedFilename,
          error: `Un asset avec le nom "${resolvedFilename}" existe déjà dans le repository de destination`,
        };
      }

      // 2. Uploader l'asset vers le repository de destination via l'Asset API
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
