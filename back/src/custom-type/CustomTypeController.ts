import {Request, Response} from 'express';
import {PrismicMigratorCustomType} from './PrismicMigratorCustomType';

export class CustomTypeController {
  private readonly migratorCustomType: PrismicMigratorCustomType;

  constructor(migratorCustomType: PrismicMigratorCustomType) {
    this.migratorCustomType = migratorCustomType;
  }


  /**
   * GET /custom-types/:repoName
   * Retrieves all custom types from the target repository
   */
  getCustomTypes = async (req: Request, res: Response): Promise<void> => {
    const repoName = req.params['repoName'] as string;
    const customTypes = await this.migratorCustomType.getCustomTypes(repoName);
    res.json(customTypes);
  };

  /**
   * POST /custom-types/migrate
   * Migrates a custom type from the source repository to the target repository
   * Body: { idSource, repoNameSource, repoNameTarget }
   */
  migrateCustomType = async (req: Request, res: Response): Promise<void> => {
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
    const result = await this.migratorCustomType.migrateCustomType(repoNameSource, repoNameTarget,idSource);
    res.json(result);
  };

  /**
   * PUT /custom-types/update
   * Updates an existing custom type in the target repository
   * Body: { idSource, repoNameSource, repoNameTarget }
   */
  updateCustomType = async (req: Request, res: Response): Promise<void> => {
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
    const result = await this.migratorCustomType.updateCustomType(repoNameSource, repoNameTarget, idSource);
    res.json(result);
  };
}
