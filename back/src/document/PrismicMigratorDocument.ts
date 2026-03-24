import * as prismic from '@prismicio/client';
import {fetch, ProxyAgent} from 'undici';
import axios, {AxiosInstance} from 'axios';
import {ValidationPipeline,} from './validation';
import {PrismicMigratorAssets} from "../asset/PrismicMigratorAssets";
import {PrismicMigratorCustomType} from "../custom-type/PrismicMigratorCustomType";
import {DocumentMigrationResult, PaginatedDocuments, ReportMigrationResult, ValidationResult} from "@shared/types";
import {
  AssetValidator,
  CustomTypeValidator,
  ExactlySameDocumentValidator,
  LinkDocumentValidator,
  LinkMediaValidator,
  SameStateCustomType,
  SameUIDDocumentValidator
} from "./validation/validators";
import {CachedPrismicClient} from "./validation/CachedPrismicClient";
import {Environment} from '@shared/types/environment.types';


const PAGE_SIZE = 30;
const MIGRATION_API_URL = 'https://migration.prismic.io';


export class PrismicMigratorDocument {
  private readonly environments: Environment[];
  private readonly prismicClients: Record<string, prismic.Client> = {};
  private readonly axiosInstance: AxiosInstance;
  private readonly migratorAsset: PrismicMigratorAssets;
  private readonly migratorCustomType: PrismicMigratorCustomType;

  constructor(environments: Environment[], axiosInstance: AxiosInstance, proxyUrl: string | undefined) {
    this.environments = environments;
    this.axiosInstance = axiosInstance;
    this.migratorAsset = new PrismicMigratorAssets(
      environments,
      axiosInstance
    );
    this.migratorCustomType = new PrismicMigratorCustomType(
      environments,
      axiosInstance
    );


    const fetchFn = proxyUrl
      ? (url: string, init?: Parameters<typeof fetch>[1]) =>
        fetch(url, {...init, dispatcher: new ProxyAgent(proxyUrl)})
      : fetch;

    const clientOptions = (token: string): prismic.ClientConfig => ({
      accessToken: token,
      fetch: fetchFn as prismic.ClientConfig['fetch'],
    });

    this.environments.forEach(env => {
      this.prismicClients[env.repoName] = prismic.createClient(env.repoName, clientOptions(env.contentToken));
    })
  }

  async getDocuments(repoName: string, page: number, type?: string): Promise<PaginatedDocuments> {

    return this.fetchDocuments(this.prismicClients[repoName], page, type);
  }

  /**
   * Run the validation pipeline for a given document ID and return the validation result without migrating the document.
   * This can be used to report validation issues to the user before attempting migration.
   * @param id
   */
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
      }
    }
    const doc = await prismicClientSource.getByID(id);
    const {result: validation} = await this.buildValidationPipeline(repoNameSource, repoNameTarget, prismicClientSource, prismicClientTarget).runWithFix(doc);
    return {validation};
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
        error: "Environment not found",
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

      }
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
        return {success: false, id: null, error: 'VALIDATION_FAILED', validation: validationResult};
      }
      const body = {
        title: this.getAnyTitle(doc),
        type: fixedDoc.type,
        uid: fixedDoc.uid ?? undefined,
        lang: fixedDoc.lang,
        data: fixedDoc.data,
      };

      const {data} = await this.axiosInstance.post<{ id: string }>(
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

      return {success: true, id: data.id, validation: validationResult, error: null};
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

      return {success: false, id: null, error: 'MIGRATION_API_ERROR', validation: failedValidation};
    }
  }

  private async fetchDocuments(client: prismic.Client, page: number, type?: string): Promise<PaginatedDocuments> {

    if (!client) {
      return {
        documents: [],
        page: 0,
        totalDocuments: 0,
        totalPages: 0,
      }
    }

    const filters = type ? [prismic.filter.at('document.type', type)] : [];
    const response = await client.get({pageSize: PAGE_SIZE, page, filters});

    return {
      documents: response.results.map(doc => ({
        id: doc.id,
        uid: doc.uid ?? null,
        title: this.getAnyTitle(doc),
        type: doc.type,
        url: doc.url ?? null,
        first_publication_date: doc.first_publication_date,
        last_publication_date: doc.last_publication_date,
      })),
      page: response.page,
      totalPages: response.total_pages,
      totalDocuments: response.total_results_size,
    };
  }

  /**
   * A document's title is not provided by Prismic Content API. We'll try to find a title
   * for the document by probing common fields, falling back to the ID if none found.
   * @param doc
   * @private
   */
  private getAnyTitle(doc: prismic.PrismicDocument): string {
    if (doc.uid) {
      return doc.uid;
    }

    const candidates = [
      'nom_du_contenu_prismic',
      'nom_prismic',
      'title',
      'titre',
      'label',
    ];

    const data = (doc as any).data;

    if (!data || typeof data !== 'object') return doc.id;

    const found = candidates
      .map(key => {
        if (!Object.hasOwn(data, key)) return null;
        const v = data[key];
        if (v == null) return null;
        if (typeof v === 'string') {
          const t = v.trim();
          return t.length ? t : null;
        }
        if (typeof v === 'number' || typeof v === 'boolean') return String(v);
        return null;
      })
      .filter((v): v is string => typeof v === 'string' && v.length > 0);

    if (found.length === 0) {
      return doc.id;
    }

    found.sort((a, b) => b.length - a.length);
    return found[0];

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
