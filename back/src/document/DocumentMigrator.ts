import * as prismic from '@prismicio/client';
import axios, { AxiosInstance } from 'axios';
import { ValidationPipeline } from './validation';
import { PrismicMigratorAssets } from '../asset/PrismicMigratorAssets';
import { PrismicMigratorCustomType } from '../custom-type/PrismicMigratorCustomType';
import { DocumentMigrationResult, ReportMigrationResult, ValidationResult } from '@shared/types';
import {
  AssetValidator,
  CustomTypeValidator,
  ExactlySameDocumentValidator,
  LinkDocumentValidator,
  LinkMediaValidator,
  SameStateCustomType,
  SameUIDDocumentValidator
} from './validation/validators';
import { CachedPrismicClient } from './validation/CachedPrismicClient';
import { Environment } from '@shared/types/environment.types';
import { getAnyTitle } from './document.utils';

const MIGRATION_API_URL = 'https://migration.prismic.io';

export class DocumentMigrator {
  private readonly environments: Environment[];
  private readonly prismicClients: Record<string, prismic.Client> = {};
  private readonly axiosInstance: AxiosInstance;
  private readonly migratorAsset: PrismicMigratorAssets;
  private readonly migratorCustomType: PrismicMigratorCustomType;

  constructor(
    environments: Environment[],
    prismicClients: Record<string, prismic.Client>,
    axiosInstance: AxiosInstance,
    migratorAsset: PrismicMigratorAssets,
    migratorCustomType: PrismicMigratorCustomType
  ) {
    this.environments = environments;
    this.prismicClients = prismicClients;
    this.axiosInstance = axiosInstance;
    this.migratorAsset = migratorAsset;
    this.migratorCustomType = migratorCustomType;
  }

  async reportMigrateDocument(repoNameSource: string, repoNameTarget: string, id: string): Promise<ReportMigrationResult> {
    const prismicClientSource = this.prismicClients[repoNameSource];
    const prismicClientTarget = this.prismicClients[repoNameTarget];
    if (!prismicClientSource || !prismicClientTarget) {
      return {
        validation: {
          valid: false,
          issues: [
            {
              severity: 'BLOCKING',
              code: 'ENV_NOT_FOUND',
              fixable: false,
              message: 'Environment not found',
              validator: this.constructor.name
            }
          ],
        }
      };
    }
    const doc = await prismicClientSource.getByID(id);
    const { result: validation } = await this.buildValidationPipeline(repoNameSource, repoNameTarget, prismicClientSource, prismicClientTarget).runWithFix(doc);
    return { validation };
  }

  async migrateDocument(repoNameSource: string, repoNameTarget: string, id: string): Promise<DocumentMigrationResult> {
    let validationResult: ValidationResult | undefined;
    const envSource = this.environments.find(e => e.repoName === repoNameSource);
    const envTarget = this.environments.find(e => e.repoName === repoNameTarget);
    const prismicClientSource = this.prismicClients[repoNameSource];
    const prismicClientTarget = this.prismicClients[repoNameTarget];
    if (!envSource || !envTarget || !prismicClientSource || !prismicClientTarget) {
      return {
        success: false,
        error: 'Environment not found',
        id,
        validation: {
          valid: false,
          issues: [{
            severity: 'BLOCKING',
            code: 'ENV_NOT_FOUND',
            fixable: false,
            message: 'Environment not found',
            validator: this.constructor.name
          }]
        }
      };
    }
    try {
      const doc = await prismicClientSource.getByID(id);

      const {
        result: validation,
        doc: fixedDoc
      } = await this.buildValidationPipeline(repoNameSource, repoNameTarget, prismicClientSource, prismicClientTarget).runWithFix(doc);
      validationResult = validation;

      // Reject only if BLOCKING issues remain after fixes
      if (!validationResult.valid) {
        return { success: false, id: null, error: 'VALIDATION_FAILED', validation: validationResult };
      }
      const body = {
        title: getAnyTitle(doc),
        type: fixedDoc.type,
        uid: fixedDoc.uid ?? undefined,
        lang: fixedDoc.lang,
        data: fixedDoc.data,
      };

      const { data } = await this.axiosInstance.post<{ id: string }>(
        `${MIGRATION_API_URL}/documents`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            'repository': envTarget.repoName,
            'authorization': `Bearer ${envTarget.writeToken}`,
          },
        }
      );

      return { success: true, id: data.id, validation: validationResult, error: null };
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? `${error.response?.status} - ${JSON.stringify(error.response?.data)}`
        : String(error);

      const failedValidation: ValidationResult = {
        valid: false,
        issues: [
          ...(validationResult?.issues ?? []),
          {
            severity: 'BLOCKING',
            code: 'MIGRATION_API_ERROR',
            validator: 'MigrationAPI',
            message: errorMessage,
            fixable: false,
          },
        ],
      };

      return { success: false, id: null, error: 'MIGRATION_API_ERROR', validation: failedValidation };
    }
  }

  private buildValidationPipeline(repoNameSource: string, repoNameTarget: string, prismicClientSource: prismic.Client, prismicClientTarget: prismic.Client): ValidationPipeline {
    const cachedSourceClient = new CachedPrismicClient(prismicClientSource);
    const cachedTargetClient = new CachedPrismicClient(prismicClientTarget);

    return new ValidationPipeline([
      new CustomTypeValidator(repoNameTarget, this.migratorCustomType),
      new AssetValidator(repoNameSource, repoNameTarget, this.migratorAsset),
      new LinkDocumentValidator(
        cachedSourceClient,
        cachedTargetClient
      ),
      new LinkMediaValidator(repoNameTarget, this.migratorAsset),
      new ExactlySameDocumentValidator(
        cachedSourceClient,
        cachedTargetClient),
      new SameUIDDocumentValidator(cachedTargetClient),
      new SameStateCustomType(repoNameSource, repoNameTarget, this.migratorCustomType)
    ]);
  }
}
