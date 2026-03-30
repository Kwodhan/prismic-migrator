import {Request, Response} from 'express';
import {PrismicMigratorAssets} from './PrismicMigratorAssets';

export class AssetController {
  private readonly migratorAsset: PrismicMigratorAssets;

  constructor(migratorAsset: PrismicMigratorAssets) {
    this.migratorAsset = migratorAsset;
  }

  /**
   * GET /assets/:repoName
   * Retrieves all assets from the repository
   */
  getAssets = async (req: Request, res: Response): Promise<void> => {
    const repoName = req.params['repoName'] as string;
    const assets = await this.migratorAsset.getAssets(repoName);
    res.json(assets);
  };

  /**
   * POST /assets/migrate
   * Migrates an asset from a source URL to the repository
   * Body: { sourceUrl, filename?, repoNameTarget }
   */
  migrateAsset = async (req: Request, res: Response): Promise<void> => {
    const {sourceUrl, repoNameTarget, filename} = req.body;

    if (!sourceUrl) {
      res.status(400).json({error: 'sourceUrl is required'});
      return;
    }
    if (!repoNameTarget) {
      res.status(400).json({error: 'repoNameTarget is required'});
      return;
    }
    const result = await this.migratorAsset.migrateAsset(repoNameTarget, sourceUrl, filename);
    res.json(result);
  };
}
