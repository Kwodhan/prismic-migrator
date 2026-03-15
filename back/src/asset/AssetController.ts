import {Request, Response} from 'express';
import {PrismicMigratorAssets} from './PrismicMigratorAssets';

export class AssetController {
  private readonly migratorAsset: PrismicMigratorAssets;

  constructor(migratorAsset: PrismicMigratorAssets) {
    this.migratorAsset = migratorAsset;
  }

  /**
   * GET /assets/:repoName
   * Récupère tous les assets du repository
   */
  getAssets = async (req: Request, res: Response): Promise<void> => {
    const repoName = req.params['repoName'] as string;
    const assets = await this.migratorAsset.getAssets(repoName);
    res.json(assets);
  };

  /**
   * POST /assets/migrate
   * Migre un asset depuis une URL source vers le repository
   * Body: { sourceUrl, filename?, repoNameTarget }
   */
  migrateAsset = async (req: Request, res: Response): Promise<void> => {
    const {sourceUrl, repoNameTarget, filename} = req.body;

    if (!sourceUrl) {
      res.status(400).json({error: 'sourceUrl est requis'});
      return;
    }
    if (!repoNameTarget) {
      res.status(400).json({error: 'repoNameTarget est requis'});
      return;
    }
    const result = await this.migratorAsset.migrateAsset(repoNameTarget, sourceUrl, filename);
    res.json(result);
  };
}

