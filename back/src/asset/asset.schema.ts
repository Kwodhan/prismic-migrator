import { z } from 'zod';
import {createRepoNameSchema} from '../common/repo-name.schema';

export const createGetAssetsParamsSchema = (allowedRepoNames: string[]) => z.object({
  repoName: createRepoNameSchema(allowedRepoNames, 'repoName'),
});

export const createMigrateAssetSchema = (allowedRepoNames: string[]) => z.object({
  sourceUrl: z.string().min(1, 'sourceUrl is required'),
  repoNameTarget: createRepoNameSchema(allowedRepoNames, 'repoNameTarget'),
  filename: z.string().optional(),
});


