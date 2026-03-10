import axios, { AxiosInstance } from 'axios';
import {CustomType, CustomTypeMigrationResult} from "@shared/types";

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
   * Private helper to fetch custom types from a repository
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
   * Fetch a custom type by its id from the given repository
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
   * Retrieve all custom types from the source repository
   */
  async getSourceCustomTypes(): Promise<CustomType[]> {
    return this.fetchCustomTypes(this.sourceRepositoryName, this.sourceToken);
  }

  /**
   * Retrieve all custom types from the target repository
   */
  async getTargetCustomTypes(): Promise<CustomType[]> {
    return this.fetchCustomTypes(this.destinationRepositoryName, this.destinationToken);
  }

  /**
   * Retrieve a custom type by id from the target repository
   */
  async getTargetCustomTypeById(id: string): Promise<CustomType | null> {
    return this.fetchCustomTypeById(id, this.destinationRepositoryName, this.destinationToken)
      .catch((error) => {
        if (axios.isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
      });
  }

  /**
   * Update an existing custom type in the target repository
   */
  async updateCustomType(id: string): Promise<CustomTypeMigrationResult> {
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
   * Migrate a custom type from the source repository to the target repository
   * @param id - Identifier of the custom type to migrate
   */
  async migrateCustomType(id: string): Promise<CustomTypeMigrationResult> {
    try {
      // 1. Fetch the custom type directly by its id from the source repository
      const customType = await this.fetchCustomTypeById(id, this.sourceRepositoryName, this.sourceToken)
        .catch((error) => {
          if (axios.isAxiosError(error) && error.response?.status === 404) return null;
          throw error;
        });

      if (!customType) {
        return { success: false, error: `Custom type "${id}" introuvable dans le repository source` };
      }

      // 2. Check if the custom type already exists in the destination repo
      const existingTarget = await this.fetchCustomTypeById(id, this.destinationRepositoryName, this.destinationToken)
        .catch((error) => {
          if (axios.isAxiosError(error) && error.response?.status === 404) return null;
          throw error;
        });

      if (existingTarget) {
        return { success: false, error: 'ALREADY_EXISTS', id, label: customType.label, target: existingTarget };
      }

      // 3. Insert the custom type into the destination repository
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
