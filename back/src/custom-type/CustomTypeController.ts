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
}

