import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import axios from 'axios';
import https from 'node:https';
import {PrismicMigratorAssets} from "./asset/PrismicMigratorAssets";
import {AssetController} from "./asset/AssetController";
import {CustomTypeController} from "./custom-type/CustomTypeController";
import {PrismicMigratorCustomType} from "./custom-type/PrismicMigratorCustomType";

dotenv.config({path: path.resolve(__dirname, '../../.env')});

const app = express();
const PORT = 3001;

console.log('[Proxy] host:', process.env.PROXY_HOST);

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({rejectUnauthorized: false}),
    proxy: process.env.PROXY_HOST ? {
        host: process.env.PROXY_HOST,
        port: Number(process.env.PROXY_PORT) || 8080,
        protocol: process.env.PROXY_PROTOCOL || 'http',
    } : false,
});

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

const assetController = new AssetController(migratorAsset);
const customTypeController = new CustomTypeController(migratorCustomType);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({status: 'ok'});
});

app.get('/config', (_req, res) => {
    res.json({
        sourceRepository: process.env.SOURCE_REPOSITORY_NAME!,
        destinationRepository: process.env.DESTINATION_REPOSITORY_NAME!,
    });
});

app.get('/assets/source', assetController.getSourceAssets);
app.get('/assets/target', assetController.getTargetAssets);
app.post('/assets/migrate', assetController.migrateAsset);

app.get('/custom-types/source', customTypeController.getSourceCustomTypes);
app.get('/custom-types/target', customTypeController.getTargetCustomTypes);
app.post('/custom-types/:id/migrate', customTypeController.migrateCustomType);
app.put('/custom-types/:id/update', customTypeController.updateCustomType);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
