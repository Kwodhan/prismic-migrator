import {OidcClaims, RolesMap} from '@shared/types/auth.types';
import {RoleExtractor} from './RoleExtractor';

/**
 * Extracts roles from Keycloak JWT format
 * Keycloak stores roles in: token.resource_access[clientId].roles
 * We transform them to nested format based on role prefix
 */
export class KeycloakRoleExtractor extends RoleExtractor {
  constructor(private readonly clientId: string) {
    super('resource_access','-');
  }

  extract(claims: OidcClaims): RolesMap {
    const resourceAccess = claims[this.roleClaim] as Record<string, { roles?: string[] }> | undefined;

    if (!resourceAccess?.[this.clientId]?.roles) {
      return {};
    }

    const roles = resourceAccess[this.clientId].roles ?? [];

    return this.transformToNested(roles);
  }
}



