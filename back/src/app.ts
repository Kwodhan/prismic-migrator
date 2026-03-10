import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { buildRouter } from './routes';
import { AxiosInstance } from 'axios';

export function createApp(axiosInstance: AxiosInstance, proxyUrl: string | undefined): express.Application {
    const app = express();

    app.use(cors());
    app.use(express.json());

    // Serve Angular front-end (production build)
    const frontDistPath = path.resolve(__dirname, '../../public');
    app.use(express.static(frontDistPath));

    // API routes
    app.use('/api', buildRouter(axiosInstance, proxyUrl));

    // SPA fallback: all non-API routes return index.html
    app.get('/{*path}', (_req, res) => {
        res.sendFile(path.join(frontDistPath, 'index.html'));
    });

    return app;
}
