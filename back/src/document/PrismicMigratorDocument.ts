import * as prismic from '@prismicio/client';
import {fetch, ProxyAgent} from 'undici';
import {AxiosInstance} from 'axios';
import {PrismicMigratorAssets} from "../asset/PrismicMigratorAssets";
import {PrismicMigratorCustomType} from "../custom-type/PrismicMigratorCustomType";
import {DocumentMigrationResult, PaginatedDocuments, ReportMigrationResult} from "@shared/types";
import {Environment} from '@shared/types/environment.types';
import {DocumentFetcher} from './DocumentFetcher';
import {DocumentMigrator} from './DocumentMigrator';



export class PrismicMigratorDocument {
  private readonly environments: Environment[];
  private readonly prismicClients: Record<string, prismic.Client> = {};
  private readonly axiosInstance: AxiosInstance;
  private readonly migratorAsset: PrismicMigratorAssets;
  private readonly migratorCustomType: PrismicMigratorCustomType;
  private readonly documentFetcher: DocumentFetcher;
  private readonly documentMigrator: DocumentMigrator;

  constructor(environments: Environment[], axiosInstance: AxiosInstance, proxyUrl?: string) {
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
    });

    this.documentFetcher = new DocumentFetcher(this.migratorCustomType);
    this.documentMigrator = new DocumentMigrator(
      environments,
      this.prismicClients,
      axiosInstance,
      this.migratorAsset,
      this.migratorCustomType
    );
  }

  async getDocuments(repoName: string, page: number, type?: string, sliceName?: string): Promise<PaginatedDocuments> {
    return sliceName
      ? this.documentFetcher.fetchDocumentsBySlice(repoName, this.prismicClients[repoName], page, sliceName)
      : this.documentFetcher.fetchDocuments(this.prismicClients[repoName], page, type);
  }

  async reportMigrateDocument(repoNameSource: string, repoNameTarget: string, id: string): Promise<ReportMigrationResult> {
    return this.documentMigrator.reportMigrateDocument(repoNameSource, repoNameTarget, id);
  }

  async migrateDocument(repoNameSource: string, repoNameTarget: string, id: string): Promise<DocumentMigrationResult> {
    return this.documentMigrator.migrateDocument(repoNameSource, repoNameTarget, id);
  }
}
