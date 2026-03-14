import axios, {AxiosInstance} from 'axios';
import {CustomType, CustomTypeMigrationResult} from "@shared/types";
import {Environnement} from '@shared/types/environnement.types';

export class PrismicMigratorCustomType {
  private static readonly BASE_URL = 'https://customtypes.prismic.io';
  private readonly environments: Environnement[]
  private readonly axiosInstance: AxiosInstance;

  constructor(
    environments: Environnement[],
    axiosInstance: AxiosInstance
  ) {
    this.environments = environments;
    this.axiosInstance = axiosInstance;
  }


  /**
   * Retrieve all custom types from the target repository
   */
  async getCustomTypes(repoName: string): Promise<CustomType[]> {
    const env = this.environments.find(env => env.repoName === repoName);
    if (!env) {
      return [];
    }
    return this.fetchCustomTypes(env.repoName, env.writeToken);
  }

  /**
   * Retrieve a custom type by id from the target repository
   */
  async getCustomTypeById(repoName: string, id: string): Promise<CustomType | null> {
    const env = this.environments.find(env => env.repoName === repoName);
    if (!env) {
      return null;
    }
    return this.fetchCustomTypeById(id, env.repoName, env.writeToken)
      .catch((error) => {
        if (axios.isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
      });
  }

  /**
   * Update an existing custom type in the target repository
   */
  async updateCustomType(repoNameSource: string, repoNameTarget: string, idSource: string): Promise<CustomTypeMigrationResult> {
    const envSource = this.environments.find(env => env.repoName === repoNameSource);
    const envTarget = this.environments.find(env => env.repoName === repoNameTarget);
    if (!envSource || !envTarget) {
      return {
        success: false,
        error: `Env ${repoNameSource} or ${repoNameTarget} not found`,
      };
    }

    try {

      const customType = await this.fetchCustomTypeById(idSource, envSource.repoName, envSource.writeToken)
        .catch((error) => {
          if (axios.isAxiosError(error) && error.response?.status === 404) return null;
          throw error;
        });

      if (!customType) {
        console.log(`[updateCustomType] ${idSource} does not exist`);
        return {success: false, error: `Custom type "${idSource}" introuvable dans le repository source`};
      }
      console.log(`[updateCustomType] ${customType?.label} started`);
      await this.axiosInstance
        .post(`${PrismicMigratorCustomType.BASE_URL}/customtypes/update`, customType, {
          headers: {
            Authorization: `Bearer ${envTarget.writeToken}`,
            repository: envTarget.repoName,
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
  async migrateCustomType(repoNameSource: string, repoNameTarget: string, id: string): Promise<CustomTypeMigrationResult> {
    const envSource = this.environments.find(env => env.repoName === repoNameSource);
    const envTarget = this.environments.find(env => env.repoName === repoNameTarget);
    if (!envSource || !envTarget) {
      return {
        success: false,
        error: `Env ${repoNameSource} or ${repoNameTarget} not found`,
      };
    }
    try {
      // 1. Fetch the custom type directly by its id from the source repository
      const customType = await this.fetchCustomTypeById(id, envSource.repoName, envSource.writeToken)
        .catch((error) => {
          if (axios.isAxiosError(error) && error.response?.status === 404) return null;
          throw error;
        });

      if (!customType) {
        return {success: false, error: `Custom type "${id}" introuvable dans le repository source`};
      }
      console.log(`[migrateCustomType] ${customType?.label} started`);
      // 2. Check if the custom type already exists in the destination repo
      const existingTarget = await this.fetchCustomTypeById(id, envTarget.repoName, envTarget.writeToken)
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
            Authorization: `Bearer ${envTarget.writeToken}`,
            repository: envTarget.repoName,
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
