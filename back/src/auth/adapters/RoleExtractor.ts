import {OidcClaims, PERMISSIONS, RolesMap} from '@shared/types';

export abstract class RoleExtractor {

  protected constructor(protected readonly roleClaim: string) {

  }

  abstract extract(claims: OidcClaims): RolesMap;

  /**
   * Transform flat Keycloak roles to nested format based on prefix
   * Example: ['app_dev_Read', 'app_dev_Asset', 'app_prod_Read'] → { app_dev: ['Read', 'Asset'], app_prod: ['Read'] }
   * @protected
   */
  protected transformToNested(roles: string[]) {

    const result: RolesMap = {};
    for (const role of roles) {
      const parts = role.split('_');
      if(parts.length < 2) {
        continue;
      }
      const permission = PERMISSIONS.find(
        (permission) => permission.toLowerCase() === parts.at(-1)?.toLowerCase()
      );
      if (!permission) {
        continue;
      }

      const prefix = parts.slice(0, -1).join('_');
      if (!result[prefix]) {
        result[prefix] = [];
      }
      result[prefix].push(permission);
    }

    return result;
  }


}
