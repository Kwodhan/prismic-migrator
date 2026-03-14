import {Request, Response} from 'express';
import {PrismicMigratorAssets} from './PrismicMigratorAssets';

export class AssetController {
  private readonly migratorAsset: PrismicMigratorAssets;

  constructor(migratorAsset: PrismicMigratorAssets) {
    this.migratorAsset = migratorAsset;
  }

  /**
   * GET /assets/source
   * Récupère tous les assets du repository source
   */
  getSourceAssets = async (_req: Request, res: Response): Promise<void> => {
    const assets = await this.migratorAsset.getSourceAssets();
    res.json(assets);
  };

  /**
   * GET /assets/target
   * Récupère tous les assets du repository de destination
   */
  getTargetAssets = async (_req: Request, res: Response): Promise<void> => {
    const assets = await this.migratorAsset.getTargetAssets();
    res.json(assets);
  };

  /**
   * POST /assets/migrate
   * Migre un asset depuis une URL source vers le repository de destination
   * Body: { sourceUrl, filename? }
   */
  migrateAsset = async (req: Request, res: Response): Promise<void> => {
    const {sourceUrl, filename} = req.body;

    if (!sourceUrl) {
      res.status(400).json({error: 'sourceUrl est requis'});
      return;
    }

    const result = await this.migratorAsset.migrateAsset(sourceUrl, filename);
    res.json(result);
  };
}

