import { Router } from 'express';
import { AssetController } from '../asset/AssetController';
import { CustomTypeController } from '../custom-type/CustomTypeController';
import { DocumentController } from '../document/DocumentController';
import { PrismicMigratorAssets } from '../asset/PrismicMigratorAssets';
import { PrismicMigratorCustomType } from '../custom-type/PrismicMigratorCustomType';
import { PrismicMigratorDocument } from '../document/PrismicMigratorDocument';
import { AxiosInstance } from 'axios';

export function buildRouter(
    axiosInstance: AxiosInstance,
    proxyUrl: string | undefined
): Router {
    const router = Router();

    const migratorAsset = new PrismicMigratorAssets(
        process.env.SOURCE_REPOSITORY_NAME!,
        process.env.SOURCE_WRITE_TOKEN!,
        process.env.DESTINATION_REPOSITORY_NAME!,
        process.env.DESTINATION_WRITE_TOKEN!,
        axiosInstance
    );

    const migratorCustomType = new PrismicMigratorCustomType(
        process.env.SOURCE_REPOSITORY_NAME!,
        process.env.SOURCE_WRITE_TOKEN!,
        process.env.DESTINATION_REPOSITORY_NAME!,
        process.env.DESTINATION_WRITE_TOKEN!,
        axiosInstance
    );

    const migratorDocument = new PrismicMigratorDocument({
        sourceRepositoryName: process.env.SOURCE_REPOSITORY_NAME!,
        sourceContentToken: process.env.SOURCE_CONTENT_TOKEN!,
        sourceWriteToken: process.env.SOURCE_WRITE_TOKEN!,
        destinationRepositoryName: process.env.DESTINATION_REPOSITORY_NAME!,
        destinationContentToken: process.env.DESTINATION_CONTENT_TOKEN!,
        destinationWriteToken: process.env.DESTINATION_WRITE_TOKEN!,
        axiosInstance,
        proxyUrl,
    });

    const assetController = new AssetController(migratorAsset);
    const customTypeController = new CustomTypeController(migratorCustomType);
    const documentController = new DocumentController(migratorDocument);

    router.get('/config', (_req, res) => {
        res.json({
            sourceRepository: process.env.SOURCE_REPOSITORY_NAME!,
            destinationRepository: process.env.DESTINATION_REPOSITORY_NAME!,
        });
    });

    router.get('/assets/source', assetController.getSourceAssets);
    router.get('/assets/target', assetController.getTargetAssets);
    router.post('/assets/migrate', assetController.migrateAsset);

    router.get('/custom-types/source', customTypeController.getSourceCustomTypes);
    router.get('/custom-types/target', customTypeController.getTargetCustomTypes);
    router.post('/custom-types/:id/migrate', customTypeController.migrateCustomType);
    router.put('/custom-types/:id/update', customTypeController.updateCustomType);

    router.get('/documents/source', documentController.getSourceDocuments);
    router.get('/documents/target', documentController.getTargetDocuments);
    router.post('/documents/:id/migrate', documentController.migrateDocument);
    router.get('/documents/:id/migrate', documentController.getReportMigrateDocument);

    return router;
}
