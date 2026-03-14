import {Request, Response} from 'express';
import {PrismicMigratorDocument} from './PrismicMigratorDocument';

export class DocumentController {
  private readonly migratorDocument: PrismicMigratorDocument;

  constructor(migratorDocument: PrismicMigratorDocument) {
    this.migratorDocument = migratorDocument;
  }

  /**
   * GET /documents/:repoName?page=1&type=searchType
   * Récupère les documents du repository (30 par page), filtrés par type si search fourni
   */
  getDocuments = async (req: Request, res: Response): Promise<void> => {
    const repoName = req.params['repoName'] as string;
    if (!repoName) {
      res.status(400).json({error: 'repoName est requis'});
      return;
    }
    const type = req.query['type'] as string | undefined;
    if (!type) {
      res.status(400).json({error: 'type est requis'});
      return;
    }
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
      res.status(400).json({error: 'idSource est requis'});
      return;
    }
    if (!repoNameSource) {
      res.status(400).json({error: 'repoNameSource est requis'});
      return;
    }
    if (!repoNameTarget) {
      res.status(400).json({error: 'repoNameTarget est requis'});
      return;
    }
    const result = await this.migratorDocument.reportMigrateDocument(repoNameSource, repoNameTarget, idSource);
    res.json(result);
  };

  /**
   * POST /documents/migrate
   * Migre un document depuis le repository source vers le repository de destination
   */
  migrateDocument = async (req: Request, res: Response): Promise<void> => {
    const {idSource, repoNameSource, repoNameTarget} = req.body;
    if (!idSource) {
      res.status(400).json({error: 'idSource est requis'});
      return;
    }
    if (!repoNameSource) {
      res.status(400).json({error: 'repoNameSource est requis'});
      return;
    }
    if (!repoNameTarget) {
      res.status(400).json({error: 'repoNameTarget est requis'});
      return;
    }
    const result = await this.migratorDocument.migrateDocument(repoNameSource, repoNameTarget, idSource);
    res.json(result);
  };

}
