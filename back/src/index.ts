import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import {PrismicMigratorAssets} from './PrismicMigratorAssets';
import {AssetController} from './AssetController';

dotenv.config({path: path.resolve(__dirname, '../../.env')});

const app = express();
const PORT = 3001;

const migratorAsset = new PrismicMigratorAssets(
    process.env.SOURCE_REPOSITORY_NAME!,
    process.env.SOURCE_WRITE_TOKEN!,
    process.env.DESTINATION_REPOSITORY_NAME!,
    process.env.DESTINATION_WRITE_TOKEN!
);

const assetController = new AssetController(migratorAsset);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({status: 'ok'});
});

app.get('/assets/source', assetController.getSourceAssets);
app.get('/assets/target', assetController.getTargetAssets);
app.post('/assets/migrate', assetController.migrateAsset);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
