import {Request, Response} from 'express';
import {PrismicMigratorAssets} from './PrismicMigratorAssets';
import {z} from 'zod';
import {createGetAssetsParamsSchema, createMigrateAssetSchema} from './asset.schema';

export class AssetController {
  private readonly migratorAsset: PrismicMigratorAssets;
  private readonly getAssetsParamsSchema: ReturnType<typeof createGetAssetsParamsSchema>;
  private readonly migrateAssetSchema: ReturnType<typeof createMigrateAssetSchema>;

  constructor(migratorAsset: PrismicMigratorAssets, allowedRepoNames: string[]) {
    this.migratorAsset = migratorAsset;
    this.getAssetsParamsSchema = createGetAssetsParamsSchema(allowedRepoNames);
    this.migrateAssetSchema = createMigrateAssetSchema(allowedRepoNames);
  }

  /**
   * GET /assets/:repoName
   * Retrieves all assets from the repository
   */
  getAssets = async (req: Request, res: Response): Promise<void> => {
    const paramsValidation = this.getAssetsParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(400).json({
        error: 'Invalid request parameters',
        details: z.treeifyError(paramsValidation.error),
      });
      return;
    }

    const {repoName} = paramsValidation.data;
    const assets = await this.migratorAsset.getAssets(repoName);
    res.json(assets);
  };

  /**
   * POST /assets/migrate
   * Migrates an asset from a source URL to the repository
   * Body: { sourceUrl, filename?, repoNameTarget }
   */
  migrateAsset = async (req: Request, res: Response): Promise<void> => {
    const validation = this.migrateAssetSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: z.treeifyError(validation.error),
      });
      return;
    }
    const {sourceUrl, repoNameTarget, filename} = validation.data;
    const result = await this.migratorAsset.migrateAsset(repoNameTarget, sourceUrl, filename);
    res.json(result);
  };
}
