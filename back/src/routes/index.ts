import {Request, RequestHandler, Router} from 'express';
import {AssetController} from '../asset/AssetController';
import {CustomTypeController} from '../custom-type/CustomTypeController';
import {DocumentController} from '../document/DocumentController';
import {PrismicMigratorAssets} from '../asset/PrismicMigratorAssets';
import {PrismicMigratorCustomType} from '../custom-type/PrismicMigratorCustomType';
import {PrismicMigratorDocument} from '../document/PrismicMigratorDocument';
import {AxiosInstance} from 'axios';
import {Environment} from '@shared/types/environment.types';
import {Permission} from '@shared/types/auth.types';
import {RbacConfig} from '../index';
import {createAuthorizationMiddleware} from '../auth/authorization.middleware';
import _ from 'lodash';

type RepoNameResolver = (req: Request) => string | undefined;

function findRolePrefix(environments: Environment[], repoName: string | undefined): string | undefined {
  if (!repoName) {
    return undefined;
  }

  const env = environments.find((environment) => environment.repoName === repoName);
  return env?.rolePrefix;
}

function requirePermissionForEnvironment(
  rbac: RbacConfig | undefined,
  environments: Environment[],
  permissions: Permission[],
  resolveRepoName: RepoNameResolver,
): RequestHandler {
  return (req, res, next) => {
    // RBAC is disabled when auth is disabled.
    if (!rbac) {
      next();
      return;
    }

    const repoName = resolveRepoName(req);
    const rolePrefix = findRolePrefix(environments, repoName);
    const authorization = createAuthorizationMiddleware(rbac.roleExtractor, permissions, rolePrefix);
    authorization(req, res, next);
  };
}

function readRepoNameFromParams(req: Request): string | undefined {
  const repoName = req.params.repoName;
  return typeof repoName === 'string' ? repoName : undefined;
}

export function buildRouter(
  axiosInstance: AxiosInstance,
  environments: Environment[],
  proxyUrl?: string,
  rbac?: RbacConfig,
): Router {
  const router = Router();

  const migratorAsset = new PrismicMigratorAssets(
    environments,
    axiosInstance
  );

  const migratorCustomType = new PrismicMigratorCustomType(
    environments,
    axiosInstance
  );

  const migratorDocument = new PrismicMigratorDocument(
    environments,
    axiosInstance,
    proxyUrl,
  );

  const allowedRepoNames = environments.map((environment) => environment.repoName);
  const assetController = new AssetController(migratorAsset, allowedRepoNames);
  const customTypeController = new CustomTypeController(migratorCustomType, allowedRepoNames);
  const documentController = new DocumentController(migratorDocument, allowedRepoNames);

  router.get('/config', (_req, res) => {
    res.json(environments.map(e => _.pick(e, ['description', 'repoName'])
    ));
   });

   // Assets endpoints
   router.get('/assets/:repoName',
    requirePermissionForEnvironment(rbac, environments, ['Read'], readRepoNameFromParams),
    assetController.getAssets
  );
  router.post('/assets/migrate',
    requirePermissionForEnvironment(rbac, environments, ['Asset'], (req) => req.body?.repoNameTarget),
    assetController.migrateAsset
  );

  // Custom types endpoints
  router.get('/custom-types/:repoName',
    requirePermissionForEnvironment(rbac, environments, ['Read'], readRepoNameFromParams),
    customTypeController.getCustomTypes
  );
  router.post('/custom-types/migrate',
    requirePermissionForEnvironment(rbac, environments, ['CustomType'], (req) => req.body?.repoNameTarget),
    customTypeController.migrateCustomType
  );
  router.put('/custom-types/update',
    requirePermissionForEnvironment(rbac, environments, ['CustomType'], (req) => req.body?.repoNameTarget),
    customTypeController.updateCustomType
  );

  // Documents endpoints
  router.post('/documents/migrate',
    requirePermissionForEnvironment(rbac, environments, ['Document'], (req) => req.body?.repoNameTarget),
    documentController.migrateDocument
  );
  router.get('/documents/migrate',
    requirePermissionForEnvironment(rbac, environments, ['Document'], (req) =>
      typeof req.query.repoNameTarget === 'string' ? req.query.repoNameTarget : undefined),
    documentController.getReportMigrateDocument
  );
  router.get('/documents/:repoName',
    requirePermissionForEnvironment(rbac, environments, ['Read'], readRepoNameFromParams),
    documentController.getDocuments
  );
  return router;
}

