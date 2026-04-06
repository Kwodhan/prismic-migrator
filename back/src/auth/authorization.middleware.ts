import {RequestHandler} from 'express';
import {OidcClaims, Permission, RolesMap} from '@shared/types/auth.types';
import {RoleExtractor} from './adapters/RoleExtractor';

declare global {
  namespace Express {
    interface Request {
      auth?: OidcClaims;
    }
  }
}

/**
 * Create a middleware that requires specific roles for an environment
 * @param roleExtractor - The role extractor instance
 * @param requiredPermissions - Permissions required to access the route
 * @param rolePrefix - The role prefix for the environment (e.g., 'app_dev')
 */
export function createAuthorizationMiddleware(
  roleExtractor: RoleExtractor,
  requiredPermissions: Permission[],
  rolePrefix?: string,
): RequestHandler {
  return (req, res, next) => {
    // If no rolePrefix configured, authorization is disabled (open bar)
    if (!rolePrefix) {
      return next();
    }

    // If no decoded JWT claims are available, authorization cannot be evaluated.
    if (!req.auth) {
      res.status(403).json({error: 'Forbidden: Authentication required'});
      return;
    }

    // Extract roles from decoded JWT claims.
    const rolesMap: RolesMap = roleExtractor.extract(req.auth);

    // Check if user has the required role prefix
    const userRoles = rolesMap[rolePrefix];
    if (!userRoles || userRoles.length === 0) {
      res.status(403).json({error: 'Forbidden: No roles for this environment'});
      return;
    }

    // Check if user has at least one of the required permissions
    const hasPermission = requiredPermissions.some((permission) =>
      userRoles.includes(permission),
    );

    if (!hasPermission) {
      res.status(403).json({
        error: `Forbidden: Required permissions [${requiredPermissions.join(', ')}]`,
      });
      return;
    }

    next();
  };
}
