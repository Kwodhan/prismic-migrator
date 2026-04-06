import {OidcClaims, RolesMap} from '@shared/types/auth.types';
import {RoleExtractor} from './RoleExtractor';

/**
 * Generic role extractor for IdP that expose roles in a configurable claim.
 * Expected claim format: ['envPrefix_Read', 'envPrefix_Asset']
 */
export class GenericRoleExtractor extends RoleExtractor {
  constructor(roleClaim: string = 'roles') {
    super(roleClaim);
  }

  extract(claims: OidcClaims): RolesMap {
    const rawRoles = claims[this.roleClaim];
    if (!Array.isArray(rawRoles)) {
      return {};
    }

    const roles = rawRoles.filter((value): value is string => typeof value === 'string');
    return this.transformToNested(roles);
  }
}

