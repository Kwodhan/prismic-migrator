import {z} from 'zod';

export function createRepoNameSchema(allowedRepoNames: string[], fieldName: string) {
  return z.string()
    .min(1, `${fieldName} is required`)
    .refine((value) => allowedRepoNames.includes(value), {
      message: `${fieldName} is not part of configured environments`,
    });
}

