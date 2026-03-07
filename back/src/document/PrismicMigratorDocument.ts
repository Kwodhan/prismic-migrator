import * as prismic from '@prismicio/client';
import {fetch, ProxyAgent} from 'undici';
import axios, {AxiosInstance} from 'axios';
import {AssetValidator, ValidationPipeline, ValidationResult,} from './validation';
import {PrismicMigratorAssets} from "../asset/PrismicMigratorAssets";
import {LinkDocumentValidator} from "./validation/validators/LinkDocumentValidator";
import {LinkMediaValidator} from "./validation/validators/LinkMediaValidator";
import {CustomTypeValidator} from "./validation/validators/CustomTypeValidator";
import {PrismicMigratorCustomType} from "../custom-type/PrismicMigratorCustomType";

export interface PrismicDocument {
    id: string;
    uid: string | null;
    type: string;
    url: string | null;
    first_publication_date: string | null;
    last_publication_date: string | null;
}

export interface PaginatedDocuments {
    documents: PrismicDocument[];
    page: number;
    totalPages: number;
    totalDocuments: number;
}

export interface DocumentMigrationResult {
    success: boolean;
    id?: string;
    error?: string;
    validation?: ValidationResult;
}

const PAGE_SIZE = 30;
const MIGRATION_API_URL = 'https://migration.prismic.io';

export class PrismicMigratorDocument {
    private readonly destinationRepositoryName: string;
    private readonly destinationWriteToken: string;
    private readonly sourcePrismicClient: prismic.Client;
    private readonly destinationPrismicClient: prismic.Client;
    private readonly axiosInstance: AxiosInstance;
    private readonly migratorAsset: PrismicMigratorAssets;
    private readonly migratorCustomType: PrismicMigratorCustomType;

    constructor(
        sourceRepositoryName: string,
        sourceContentToken: string,
        sourceWriteToken: string,
        destinationRepositoryName: string,
        destinationContentToken: string,
        destinationWriteToken: string,
        axiosInstance: AxiosInstance,
        proxyUrl?: string,
    ) {
        this.destinationRepositoryName = destinationRepositoryName;
        this.destinationWriteToken = destinationWriteToken;
        this.axiosInstance = axiosInstance;
        this.migratorAsset = new PrismicMigratorAssets(
            sourceRepositoryName,
            sourceWriteToken,
            destinationRepositoryName,
            destinationWriteToken,
            axiosInstance
        );
        this.migratorCustomType = new PrismicMigratorCustomType(
            sourceRepositoryName,
            sourceWriteToken,
            destinationRepositoryName,
            destinationWriteToken,
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

        this.sourcePrismicClient = prismic.createClient(sourceRepositoryName, clientOptions(sourceContentToken));
        this.destinationPrismicClient = prismic.createClient(destinationRepositoryName, clientOptions(destinationContentToken));
    }

    private async fetchDocuments(client: prismic.Client, page: number, type?: string): Promise<PaginatedDocuments> {
        const filters = type ? [prismic.filter.at('document.type', type)] : [];
        const response = await client.get({pageSize: PAGE_SIZE, page, filters});

        return {
            documents: response.results.map(doc => ({
                id: doc.id,
                uid: doc.uid ?? null,
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

    async getSourceDocuments(page: number, type?: string): Promise<PaginatedDocuments> {
        return this.fetchDocuments(this.sourcePrismicClient, page, type);
    }

    async getTargetDocuments(page: number, type?: string): Promise<PaginatedDocuments> {
        return this.fetchDocuments(this.destinationPrismicClient, page, type);
    }

    private buildValidationPipeline(): ValidationPipeline {
        return new ValidationPipeline([
            new CustomTypeValidator(this.migratorCustomType),
            new AssetValidator(this.migratorAsset),
            new LinkDocumentValidator(
                this.sourcePrismicClient,
                this.destinationPrismicClient,
            ),
            new LinkMediaValidator(this.migratorAsset),
        ]);
    }


    async migrateDocument(id: string): Promise<DocumentMigrationResult> {
        let validationResult: ValidationResult | undefined;
        try {
            const doc = await this.sourcePrismicClient.getByID(id);

            const { result: validation, doc: fixedDoc } = await this.buildValidationPipeline().runWithFix(doc);
            validationResult = validation;

            // Refuser uniquement si des BLOCKING subsistent après les fix
            if (!validationResult.valid) {
                return {success: false, error: 'VALIDATION_FAILED', validation: validationResult};
            }
            const body = {
                title: fixedDoc.uid ?? fixedDoc.id,
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
                        'repository': this.destinationRepositoryName,
                        'authorization': `Bearer ${this.destinationWriteToken}`,
                    },
                }
            );

            return {success: true, id: data.id, validation: validationResult};
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

            return {success: false, error: 'MIGRATION_API_ERROR', validation: failedValidation};
        }
    }
}
