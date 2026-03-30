import {Request, Response} from 'express';
import {PrismicMigratorCustomType} from './PrismicMigratorCustomType';
import {createGetCustomTypesParamsSchema, createMigrateCustomTypeSchema} from './custom-type.schema';
import {z} from 'zod';

export class CustomTypeController {
  private readonly migratorCustomType: PrismicMigratorCustomType;
  private readonly getCustomTypesParamsSchema: ReturnType<typeof createGetCustomTypesParamsSchema>;
  private readonly migrateCustomTypeSchema: ReturnType<typeof createMigrateCustomTypeSchema>;

  constructor(migratorCustomType: PrismicMigratorCustomType, allowedRepoNames: string[]) {
    this.migratorCustomType = migratorCustomType;
    this.getCustomTypesParamsSchema = createGetCustomTypesParamsSchema(allowedRepoNames);
    this.migrateCustomTypeSchema = createMigrateCustomTypeSchema(allowedRepoNames);
  }


  /**
   * GET /custom-types/:repoName
   * Retrieves all custom types from the target repository
   */
  getCustomTypes = async (req: Request, res: Response): Promise<void> => {
    const paramsValidation = this.getCustomTypesParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(400).json({
        error: 'Invalid request parameters',
        details: z.treeifyError(paramsValidation.error),
      });
      return;
    }

    const {repoName} = paramsValidation.data;
    const customTypes = await this.migratorCustomType.getCustomTypes(repoName);
    res.json(customTypes);
  };

  /**
   * POST /custom-types/migrate
   * Migrates a custom type from the source repository to the target repository
   * Body: { idSource, repoNameSource, repoNameTarget }
   */
  migrateCustomType = async (req: Request, res: Response): Promise<void> => {
    const validation = this.migrateCustomTypeSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: z.treeifyError(validation.error),
      });
      return;
    }
    const {idSource, repoNameSource, repoNameTarget} = validation.data;
    const result = await this.migratorCustomType.migrateCustomType(repoNameSource, repoNameTarget, idSource);
    res.json(result);
  };

  /**
   * PUT /custom-types/update
   * Updates an existing custom type in the target repository
   * Body: { idSource, repoNameSource, repoNameTarget }
   */
  updateCustomType = async (req: Request, res: Response): Promise<void> => {
    const validation = this.migrateCustomTypeSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: z.treeifyError(validation.error),
      });
      return;
    }
    const {idSource, repoNameSource, repoNameTarget} = validation.data;
    const result = await this.migratorCustomType.updateCustomType(repoNameSource, repoNameTarget, idSource);
    res.json(result);
  };
}
