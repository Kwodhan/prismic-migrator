import {Request, Response} from 'express';
import {PrismicMigratorDocument} from './PrismicMigratorDocument';
import {createGetDocumentsParamsSchema, createMigrateDocumentSchema, getDocumentsQuerySchema,} from './document.schema';
import {z} from 'zod';

export class DocumentController {
  private readonly migratorDocument: PrismicMigratorDocument;
  private readonly getDocumentsParamsSchema: ReturnType<typeof createGetDocumentsParamsSchema>;
  private readonly migrateDocumentSchema: ReturnType<typeof createMigrateDocumentSchema>;

  constructor(migratorDocument: PrismicMigratorDocument, allowedRepoNames: string[]) {
    this.migratorDocument = migratorDocument;
    this.getDocumentsParamsSchema = createGetDocumentsParamsSchema(allowedRepoNames);
    this.migrateDocumentSchema = createMigrateDocumentSchema(allowedRepoNames);
  }

  /**
   * GET /documents/:repoName?page=1&type=searchType
   * Retrieves documents from the repository (30 per page), filtered by type if search is provided
   */
  getDocuments = async (req: Request, res: Response): Promise<void> => {
    const paramsValidation = this.getDocumentsParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(400).json({
        error: 'Invalid request parameters',
        details: z.treeifyError(paramsValidation.error),
      });
      return;
    }

    const queryValidation = getDocumentsQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: z.treeifyError(queryValidation.error),
      });
      return;
    }

    const {repoName} = paramsValidation.data;
    const {type, page} = queryValidation.data;
    const result = await this.migratorDocument.getDocuments(repoName, page, type);
    res.json(result);
  };

  /**
   * GET /documents/migrate?idSource=XX&repoNameSource=source&repoNameTarget=target
   * Get report of the migration of a document from the source repository to the target repository, without performing the migration
   */
  getReportMigrateDocument = async (req: Request, res: Response): Promise<void> => {
    const validation = this.migrateDocumentSchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: z.treeifyError(validation.error),
      });
      return;
    }

    const {idSource, repoNameSource, repoNameTarget} = validation.data;
    const result = await this.migratorDocument.reportMigrateDocument(repoNameSource, repoNameTarget, idSource);
    res.json(result);
  };

  /**
   * POST /documents/migrate
   * Migrates a document from the source repository to the target repository
   */
  migrateDocument = async (req: Request, res: Response): Promise<void> => {
    const validation = this.migrateDocumentSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: z.treeifyError(validation.error),
      });
      return;
    }

    const {idSource, repoNameSource, repoNameTarget} = validation.data;
    const result = await this.migratorDocument.migrateDocument(repoNameSource, repoNameTarget, idSource);
    res.json(result);
  };

}
