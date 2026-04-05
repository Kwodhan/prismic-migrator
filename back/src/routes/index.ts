import {Router} from 'express';
import {AssetController} from '../asset/AssetController';
import {CustomTypeController} from '../custom-type/CustomTypeController';
import {DocumentController} from '../document/DocumentController';
import {PrismicMigratorAssets} from '../asset/PrismicMigratorAssets';
import {PrismicMigratorCustomType} from '../custom-type/PrismicMigratorCustomType';
import {PrismicMigratorDocument} from '../document/PrismicMigratorDocument';
import {AxiosInstance} from 'axios';
import {Environment} from '@shared/types/environment.types';
import _ from 'lodash';

export function buildRouter(
  axiosInstance: AxiosInstance,
  environments: Environment[],
  proxyUrl?: string
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

  router.get('/assets/:repoName', assetController.getAssets);
  router.post('/assets/migrate', assetController.migrateAsset);

  router.get('/custom-types/:repoName', customTypeController.getCustomTypes);
  router.post('/custom-types/migrate', customTypeController.migrateCustomType);
  router.put('/custom-types/update', customTypeController.updateCustomType);


  router.post('/documents/migrate', documentController.migrateDocument);
  router.get('/documents/migrate', documentController.getReportMigrateDocument);
  router.get('/documents/:repoName', documentController.getDocuments);
  return router;
}
