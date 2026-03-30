import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { buildRouter } from './routes';
import { AxiosInstance } from 'axios';
import { oidcMiddleware } from './auth/oidc.middleware';

export function createApp(axiosInstance: AxiosInstance, proxyUrl?: string, jwksUri?: string): express.Application {
    const app = express();

    app.use(cors());
    app.use(express.json());

    // Serve Angular front-end (production build)
    const frontDistPath = path.resolve(__dirname, '../../public');
    app.use(express.static(frontDistPath));

    app.get('/api/auth/config', (_req, res) => {
        res.json({
            issuer: process.env.OIDC_ISSUER ?? '',
            clientId: process.env.OIDC_CLIENT_ID ?? '',
            scope: process.env.OIDC_SCOPE ?? 'openid profile email',
        });
    });

    if (process.env.OIDC_ISSUER && jwksUri) {
        app.use('/api', oidcMiddleware(jwksUri), buildRouter(axiosInstance, proxyUrl));
    } else {
        app.use('/api', buildRouter(axiosInstance, proxyUrl));
    }

    app.get('/{*path}', (_req, res) => {
        res.sendFile(path.join(frontDistPath, 'index.html'));
    });

    app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (err.name === 'UnauthorizedError') {
            console.error('[Auth] 401:', err.code, '-', err.message);
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        next(err);
    });

    return app;
}
