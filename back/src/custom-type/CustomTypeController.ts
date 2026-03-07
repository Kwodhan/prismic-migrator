import { Request, Response } from 'express';
import { PrismicMigratorCustomType } from './PrismicMigratorCustomType';

export class CustomTypeController {
  private readonly migratorCustomType: PrismicMigratorCustomType;

  constructor(migratorCustomType: PrismicMigratorCustomType) {
    this.migratorCustomType = migratorCustomType;
  }

  /**
   * GET /custom-types/source
   * Récupère tous les custom types du repository source
   */
  getSourceCustomTypes = async (_req: Request, res: Response): Promise<void> => {
    const customTypes = await this.migratorCustomType.getSourceCustomTypes();
    res.json(customTypes);
  };

  /**
   * GET /custom-types/target
   * Récupère tous les custom types du repository de destination
   */
  getTargetCustomTypes = async (_req: Request, res: Response): Promise<void> => {
    const customTypes = await this.migratorCustomType.getTargetCustomTypes();
    res.json(customTypes);
  };

  /**
   * POST /custom-types/:id/migrate
   * Migre un custom type depuis le repository source vers le repository de destination
   */
  migrateCustomType = async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string;
    const result = await this.migratorCustomType.migrateCustomType(id);
    res.json(result);
  };

  /**
   * PUT /custom-types/:id/update
   * Met à jour un custom type existant dans le repository de destination
   */
  updateCustomType = async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string;
    const result = await this.migratorCustomType.updateCustomType(id);
    res.json(result);
  };
}

