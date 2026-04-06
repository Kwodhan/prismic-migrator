import {GenericRoleExtractor} from './GenericRoleExtractor';
import {KeycloakRoleExtractor} from './KeycloakRoleExtractor';
import {RoleExtractor} from './RoleExtractor';

export type RoleExtractorType = 'keycloak' | 'generic';

/**
 * Factory to instantiate role extractors based on configuration
 */
export function createRoleExtractor(
  type: RoleExtractorType = 'keycloak',
  clientId?: string,
  roleClaim?: string,
  roleSeparator?: string,
): RoleExtractor {
  switch (type) {
    case 'keycloak':
      if (!clientId) {
        throw new Error('clientId is required for Keycloak role extractor');
      }
      return new KeycloakRoleExtractor(clientId);
    case 'generic':
      return new GenericRoleExtractor(roleClaim, roleSeparator);
    default:
      throw new Error(`Unknown role extractor type: ${type}`);
  }
}


