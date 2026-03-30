import {z} from 'zod';
import {createRepoNameSchema} from '../common/repo-name.schema';

export const createGetDocumentsParamsSchema = (allowedRepoNames: string[]) => z.object({
  repoName: createRepoNameSchema(allowedRepoNames, 'repoName'),
});

export const getDocumentsQuerySchema = z.object({
  type: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
});

export const createMigrateDocumentSchema = (allowedRepoNames: string[]) => z.object({
  idSource: z.string().min(1, 'idSource is required'),
  repoNameSource: createRepoNameSchema(allowedRepoNames, 'repoNameSource'),
  repoNameTarget: createRepoNameSchema(allowedRepoNames, 'repoNameTarget'),
});
