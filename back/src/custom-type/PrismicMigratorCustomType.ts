import axios, {AxiosInstance} from 'axios';
import {CustomType, CustomTypeMigrationResult} from "@shared/types";

export class PrismicMigratorCustomType {
  private static readonly BASE_URL = 'https://customtypes.prismic.io';
  private readonly sourceRepositoryName: string;
  private readonly sourceToken: string;
  private readonly targetRepositoryName: string;
  private readonly targetToken: string;
  private readonly axiosInstance: AxiosInstance;

  constructor(
    sourceRepositoryName: string,
    sourceToken: string,
    destinationRepositoryName: string,
    destinationToken: string,
    axiosInstance: AxiosInstance
  ) {
    this.sourceRepositoryName = sourceRepositoryName;
    this.sourceToken = sourceToken;
    this.targetRepositoryName = destinationRepositoryName;
    this.targetToken = destinationToken;
    this.axiosInstance = axiosInstance;
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
    return this.fetchCustomTypes(this.targetRepositoryName, this.targetToken);
  }

  /**
   * Retrieve a custom type by id from the target repository
   */
  async getTargetCustomTypeById(id: string): Promise<CustomType | null> {
    return this.fetchCustomTypeById(id, this.targetRepositoryName, this.targetToken)
      .catch((error) => {
        if (axios.isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
      });
  }

  async getSourceCustomTypeById(id: string): Promise<CustomType | null> {
    return this.fetchCustomTypeById(id, this.sourceRepositoryName, this.sourceToken)
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
        console.log(`[updateCustomType] ${id} does not exist`);
        return {success: false, error: `Custom type "${id}" introuvable dans le repository source`};
      }
      console.log(`[updateCustomType] ${customType?.label} started`);
      await this.axiosInstance
        .post(`${PrismicMigratorCustomType.BASE_URL}/customtypes/update`, customType, {
          headers: {
            Authorization: `Bearer ${this.targetToken}`,
            repository: this.targetRepositoryName,
            'Content-Type': 'application/json',
          },
        })
        .catch((error) => {
          if (axios.isAxiosError(error)) {
            console.error(`[updateCustomType] ${error.response?.status}`, JSON.stringify(error.response?.data, null, 2));
          }
          throw error;
        });
      console.log(`[updateCustomType] ${customType?.label} successfully updated`);
      return {success: true, id: customType.id, label: customType.label};
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
        return {success: false, error: `Custom type "${id}" introuvable dans le repository source`};
      }
      console.log(`[migrateCustomType] ${customType?.label} started`);
      // 2. Check if the custom type already exists in the destination repo
      const existingTarget = await this.fetchCustomTypeById(id, this.targetRepositoryName, this.targetToken)
        .catch((error) => {
          if (axios.isAxiosError(error) && error.response?.status === 404) return null;
          throw error;
        });

      if (existingTarget) {
        return {success: false, error: 'ALREADY_EXISTS', id, label: customType.label, target: existingTarget};
      }

      // 3. Insert the custom type into the destination repository
      await this.axiosInstance
        .post(`${PrismicMigratorCustomType.BASE_URL}/customtypes/insert`, customType, {
          headers: {
            Authorization: `Bearer ${this.targetToken}`,
            repository: this.targetRepositoryName,
            'Content-Type': 'application/json',
          },
        })
        .catch((error) => {
          if (axios.isAxiosError(error)) {
            console.error(`[migrateCustomType] ${error.response?.status}`, JSON.stringify(error.response?.data, null, 2));
          }
          throw error;
        });
      console.log(`[migrateCustomType] ${customType?.label} successfully migrated`);
      return {success: true, id: customType.id, label: customType.label};
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
   * Private helper to fetch custom types from a repository
   */
  private async fetchCustomTypes(repositoryName: string, token: string): Promise<CustomType[]> {
    console.log(`[fetchCustomTypes] ${repositoryName} `);
    const {data} = await this.axiosInstance
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
    console.log(`[fetchCustomTypeById] ${id} on ${repositoryName} `);

    const {data} = await this.axiosInstance
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
}
