import { Request, Response } from 'express';
import { PrismicMigratorDocument } from './PrismicMigratorDocument';

export class DocumentController {
  private readonly migratorDocument: PrismicMigratorDocument;

  constructor(migratorDocument: PrismicMigratorDocument) {
    this.migratorDocument = migratorDocument;
  }

  /**
   * GET /documents/source?page=1&type=searchType
   * Récupère les documents du repository source (30 par page), filtrés par type si search fourni
   */
  getSourceDocuments = async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query['page']) || 1;
    const type = req.query['type'] as string | undefined;
    const result = await this.migratorDocument.getSourceDocuments(page, type);
    res.json(result);
  };

  /**
   * GET /documents/target?page=1&type=searchType
   * Récupère les documents du repository de destination (30 par page), filtrés par type si search fourni
   */
  getTargetDocuments = async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query['page']) || 1;
    const type = req.query['type'] as string | undefined;
    const result = await this.migratorDocument.getTargetDocuments(page, type);
    res.json(result);
  };

}
