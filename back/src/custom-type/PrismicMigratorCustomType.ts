import axios, { AxiosInstance } from 'axios';
import https from 'node:https';

export interface CustomType {
  id: string;
  label: string;
  repeatable: boolean;
  json: Record<string, unknown>;
  status: boolean;
}

export class PrismicMigratorCustomType {
  private readonly sourceRepositoryName: string;
  private readonly sourceToken: string;
  private readonly destinationRepositoryName: string;
  private readonly destinationToken: string;
  private readonly axiosInstance: AxiosInstance;

  private static readonly BASE_URL = 'https://customtypes.prismic.io';

  constructor(
    sourceRepositoryName: string,
    sourceToken: string,
    destinationRepositoryName: string,
    destinationToken: string
  ) {
    this.sourceRepositoryName = sourceRepositoryName;
    this.sourceToken = sourceToken;
    this.destinationRepositoryName = destinationRepositoryName;
    this.destinationToken = destinationToken;

    this.axiosInstance = axios.create({
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      proxy: process.env.PROXY_HOST
        ? {
            host: process.env.PROXY_HOST,
            port: Number(process.env.PROXY_PORT) || 8080,
            protocol: process.env.PROXY_PROTOCOL || 'http',
          }
        : false,
    });
  }

  /**
   * Méthode privée commune pour récupérer les custom types d'un repository
   */
  private async fetchCustomTypes(repositoryName: string, token: string): Promise<CustomType[]> {
    const { data } = await this.axiosInstance
      .get<CustomType[]>(`${PrismicMigratorCustomType.BASE_URL}/customtypes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          repository: repositoryName,
        },
      })
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          console.error(
            `[fetchCustomTypes] ${error.response?.status}`,
            JSON.stringify(error.response?.data, null, 2)
          );
        }
        throw error;
      });

    return data.filter(ct => ct.status);
  }

  /**
   * Récupère tous les custom types du repository source
   */
  async getSourceCustomTypes(): Promise<CustomType[]> {
    return this.fetchCustomTypes(this.sourceRepositoryName, this.sourceToken);
  }

  /**
   * Récupère tous les custom types du repository de destination
   */
  async getTargetCustomTypes(): Promise<CustomType[]> {
    return this.fetchCustomTypes(this.destinationRepositoryName, this.destinationToken);
  }
}

