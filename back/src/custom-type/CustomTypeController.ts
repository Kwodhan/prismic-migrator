import {Request, Response} from 'express';
import {PrismicMigratorCustomType} from './PrismicMigratorCustomType';

export class CustomTypeController {
  private readonly migratorCustomType: PrismicMigratorCustomType;

  constructor(migratorCustomType: PrismicMigratorCustomType) {
    this.migratorCustomType = migratorCustomType;
  }


  /**
   * GET /custom-types/:repoName
   * Récupère tous les custom types du repository de destination
   */
  getCustomTypes = async (req: Request, res: Response): Promise<void> => {
    const repoName = req.params['repoName'] as string;
    const customTypes = await this.migratorCustomType.getCustomTypes(repoName);
    res.json(customTypes);
  };

  /**
   * POST /custom-types/migrate
   * Migre un custom type depuis le repository source vers le repository de destination
   * Body: { idSource, repoNameSource, repoNameTarget }
   */
  migrateCustomType = async (req: Request, res: Response): Promise<void> => {
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
    const result = await this.migratorCustomType.migrateCustomType(repoNameSource, repoNameTarget,idSource);
    res.json(result);
  };

  /**
   * PUT /custom-types/update
   * Met à jour un custom type existant dans le repository de destination
   * Body: { idSource, repoNameSource, repoNameTarget }
   */
  updateCustomType = async (req: Request, res: Response): Promise<void> => {
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
    const result = await this.migratorCustomType.updateCustomType(repoNameSource, repoNameTarget, idSource);
    res.json(result);
  };
}

