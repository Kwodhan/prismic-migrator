import { z } from 'zod';
import {createRepoNameSchema} from '../common/repo-name.schema';

export const createGetCustomTypesParamsSchema = (allowedRepoNames: string[]) => z.object({
  repoName: createRepoNameSchema(allowedRepoNames, 'repoName'),
});

export const createMigrateCustomTypeSchema = (allowedRepoNames: string[]) => z.object({
  idSource: z.string().min(1, 'idSource is required'),
  repoNameSource: createRepoNameSchema(allowedRepoNames, 'repoNameSource'),
  repoNameTarget: createRepoNameSchema(allowedRepoNames, 'repoNameTarget'),
});


