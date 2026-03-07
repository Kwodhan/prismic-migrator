import { AxiosInstance } from 'axios';
import axios from 'axios';

export interface CustomType {
  id: string;
  label: string;
  repeatable: boolean;
  json: Record<string, unknown>;
  status: boolean;
}

export interface MigrationResult {
  success: boolean;
  id?: string;
  label?: string;
  target?: CustomType;
  error?: string;
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
    destinationToken: string,
    axiosInstance: AxiosInstance
  ) {
    this.sourceRepositoryName = sourceRepositoryName;
    this.sourceToken = sourceToken;
    this.destinationRepositoryName = destinationRepositoryName;
    this.destinationToken = destinationToken;
    this.axiosInstance = axiosInstance;
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
   * Récupère un custom type par son id depuis le repository source
   */
  private async fetchCustomTypeById(id: string, repositoryName: string, token: string): Promise<CustomType> {
    const { data } = await this.axiosInstance
      .get<CustomType>(`${PrismicMigratorCustomType.BASE_URL}/customtypes/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          repository: repositoryName,
        },
      })
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          console.error(`[fetchCustomTypeById] ${error.response?.status}`, JSON.stringify(error.response?.data, null, 2));
        }
        throw error;
      });

    return data;
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

  /**
   * Récupère un custom type par son id depuis le repository de destination
   */
  async getTargetCustomTypeById(id: string): Promise<CustomType | null> {
    return this.fetchCustomTypeById(id, this.destinationRepositoryName, this.destinationToken)
      .catch((error) => {
        if (axios.isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
      });
  }

  /**
   * Met à jour un custom type existant dans le repository de destination
   */
  async updateCustomType(id: string): Promise<MigrationResult> {
    try {
      const customType = await this.fetchCustomTypeById(id, this.sourceRepositoryName, this.sourceToken)
        .catch((error) => {
          if (axios.isAxiosError(error) && error.response?.status === 404) return null;
          throw error;
        });

      if (!customType) {
        return { success: false, error: `Custom type "${id}" introuvable dans le repository source` };
      }

      await this.axiosInstance
        .post(`${PrismicMigratorCustomType.BASE_URL}/customtypes/update`, customType, {
          headers: {
            Authorization: `Bearer ${this.destinationToken}`,
            repository: this.destinationRepositoryName,
            'Content-Type': 'application/json',
          },
        })
        .catch((error) => {
          if (axios.isAxiosError(error)) {
            console.error(`[updateCustomType] ${error.response?.status}`, JSON.stringify(error.response?.data, null, 2));
          }
          throw error;
        });

      return { success: true, id: customType.id, label: customType.label };
    } catch (error) {
      return {
        success: false,
        error: axios.isAxiosError(error)
          ? `${error.response?.status} - ${JSON.stringify(error.response?.data)}`
          : String(error),
      };
    }
  }

  /**
   * Migre un custom type depuis le repository source vers le repository de destination
   * @param id - Identifiant du custom type à migrer
   */
  async migrateCustomType(id: string): Promise<MigrationResult> {
    try {
      // 1. Récupérer le custom type directement par son id depuis le repository source
      const customType = await this.fetchCustomTypeById(id, this.sourceRepositoryName, this.sourceToken)
        .catch((error) => {
          if (axios.isAxiosError(error) && error.response?.status === 404) return null;
          throw error;
        });

      if (!customType) {
        return { success: false, error: `Custom type "${id}" introuvable dans le repository source` };
      }

      // 2. Vérifier si le custom type existe déjà dans le repo destination
      const existingTarget = await this.fetchCustomTypeById(id, this.destinationRepositoryName, this.destinationToken)
        .catch((error) => {
          if (axios.isAxiosError(error) && error.response?.status === 404) return null;
          throw error;
        });

      if (existingTarget) {
        return { success: false, error: 'ALREADY_EXISTS', id, label: customType.label, target: existingTarget };
      }

      // 3. Insérer le custom type dans le repository de destination
      await this.axiosInstance
        .post(`${PrismicMigratorCustomType.BASE_URL}/customtypes/insert`, customType, {
          headers: {
            Authorization: `Bearer ${this.destinationToken}`,
            repository: this.destinationRepositoryName,
            'Content-Type': 'application/json',
          },
        })
        .catch((error) => {
          if (axios.isAxiosError(error)) {
            console.error(`[migrateCustomType] ${error.response?.status}`, JSON.stringify(error.response?.data, null, 2));
          }
          throw error;
        });

      return { success: true, id: customType.id, label: customType.label };
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

