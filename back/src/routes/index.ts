import {Router} from 'express';
import {AssetController} from '../asset/AssetController';
import {CustomTypeController} from '../custom-type/CustomTypeController';
import {DocumentController} from '../document/DocumentController';
import {PrismicMigratorAssets} from '../asset/PrismicMigratorAssets';
import {PrismicMigratorCustomType} from '../custom-type/PrismicMigratorCustomType';
import {PrismicMigratorDocument} from '../document/PrismicMigratorDocument';
import {AxiosInstance} from 'axios';
import {Environnement} from '@shared/types/environnement.types';

export function buildRouter(
  axiosInstance: AxiosInstance,
  proxyUrl: string | undefined
): Router {
  const router = Router();

  const environments: Environnement[] = [];
  let i = 0;
  while (process.env[`ENV_${i}_REPOSITORY_NAME`]) {
    if (process.env[`ENV_${i}_WRITE_TOKEN`] && process.env[`ENV_${i}_CONTENT_TOKEN`]) {
      environments.push({
        repoName: process.env[`ENV_${i}_REPOSITORY_NAME`] ?? "",
        description: process.env[`ENV_${i}_DESCRIPTION`],
        writeToken: process.env[`ENV_${i}_WRITE_TOKEN`] ?? "",
        contentToken: process.env[`ENV_${i}_CONTENT_TOKEN`] ?? "",
      });
    }
    i++;
  }

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

  const assetController = new AssetController(migratorAsset);
  const customTypeController = new CustomTypeController(migratorCustomType);
  const documentController = new DocumentController(migratorDocument);

  router.get('/config', (_req, res) => {
    res.json(environments);
  });

  router.get('/assets/:repoName', assetController.getAssets);
  router.post('/assets/migrate', assetController.migrateAsset);

  router.get('/custom-types/:repoName', customTypeController.getCustomTypes);
  router.post('/custom-types/migrate', customTypeController.migrateCustomType);
  router.put('/custom-types/update', customTypeController.updateCustomType);

  router.get('/documents/:repoName', documentController.getDocuments);
  router.post('/documents/migrate', documentController.migrateDocument);
  router.get('/documents/migrate', documentController.getReportMigrateDocument);

  return router;
}
