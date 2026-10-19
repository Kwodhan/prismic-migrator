import {z} from 'zod';
import {createRepoNameSchema} from '../common/repo-name.schema';

export const createGetDocumentsParamsSchema = (allowedRepoNames: string[]) => z.object({
  repoName: createRepoNameSchema(allowedRepoNames, 'repoName'),
});

export const getDocumentsQuerySchema = z.object({
  type: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  sliceName: z.string().optional(),
});

export const findDocumentsByReferenceQuerySchema = z.object({
  referenceType: z.enum(['document', 'media', 'url']),
  reference: z.string().trim().min(1),
}).superRefine(({referenceType, reference}, context) => {
  if (referenceType === 'url') {
    try {
      new URL(reference);
    } catch {
      context.addIssue({
        code: 'custom',
        path: ['reference'],
        message: 'A valid URL is required for URL references',
      });
    }
  }
});

export const createMigrateDocumentSchema = (allowedRepoNames: string[]) => z.object({
  idSource: z.string().min(1, 'idSource is required'),
  repoNameSource: createRepoNameSchema(allowedRepoNames, 'repoNameSource'),
  repoNameTarget: createRepoNameSchema(allowedRepoNames, 'repoNameTarget'),
});
