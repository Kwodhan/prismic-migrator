import {Request, Response} from 'express';
import {PrismicMigratorDocument} from './PrismicMigratorDocument';

export class DocumentController {
  private readonly migratorDocument: PrismicMigratorDocument;

  constructor(migratorDocument: PrismicMigratorDocument) {
    this.migratorDocument = migratorDocument;
  }

  /**
   * GET /documents/:repoName?page=1&type=searchType
   * Retrieves documents from the repository (30 per page), filtered by type if search is provided
   */
  getDocuments = async (req: Request, res: Response): Promise<void> => {
    const repoName = req.params['repoName'] as string;
    if (!repoName) {
      res.status(400).json({error: 'repoName is required'});
      return;
    }
    const type = req.query['type'] as string | undefined;
    const page = Number(req.query['page']) || 1;
    const result = await this.migratorDocument.getDocuments(repoName, page, type);
    res.json(result);
  };

  /**
   * GET /documents/migrate?idSource=XX&repoNameSource=source&repoNameTarget=target
   * Get report of the migration of a document from the source repository to the target repository, without performing the migration
   */
  getReportMigrateDocument = async (req: Request, res: Response): Promise<void> => {

    const idSource = req.query['idSource'] as string;
    const repoNameSource = req.query['repoNameSource'] as string;
    const repoNameTarget = req.query['repoNameTarget'] as string;
    if (!idSource) {
      res.status(400).json({error: 'idSource is required'});
      return;
    }
    if (!repoNameSource) {
      res.status(400).json({error: 'repoNameSource is required'});
      return;
    }
    if (!repoNameTarget) {
      res.status(400).json({error: 'repoNameTarget is required'});
      return;
    }
    const result = await this.migratorDocument.reportMigrateDocument(repoNameSource, repoNameTarget, idSource);
    res.json(result);
  };

  /**
   * POST /documents/migrate
   * Migrates a document from the source repository to the target repository
   */
  migrateDocument = async (req: Request, res: Response): Promise<void> => {
    const {idSource, repoNameSource, repoNameTarget} = req.body;
    if (!idSource) {
      res.status(400).json({error: 'idSource is required'});
      return;
    }
    if (!repoNameSource) {
      res.status(400).json({error: 'repoNameSource is required'});
      return;
    }
    if (!repoNameTarget) {
      res.status(400).json({error: 'repoNameTarget is required'});
      return;
    }
    const result = await this.migratorDocument.migrateDocument(repoNameSource, repoNameTarget, idSource);
    res.json(result);
  };

}
