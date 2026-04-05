import express from 'express';
import cors from 'cors';
import path from 'node:path';
import {buildRouter} from './routes';
import axios from 'axios';
import {oidcMiddleware} from './auth/oidc.middleware';
import {Environment} from '@shared/types/environment.types';
import {OidcConfig, ProxyConfig} from './index';
import https from 'node:https';


export function createApp(
  environments: Environment[],
  oidc: OidcConfig,
  proxy?: ProxyConfig,
  jwksUri?: string,
): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Serve Angular front-end (production build)
  const frontDistPath = path.resolve(__dirname, '../../public');
  app.use(express.static(frontDistPath));

  app.get('/api/auth/config', (_req, res) => {
    res.json({
      issuer: oidc.issuer,
      clientId: oidc.clientId,
      scope: oidc.scope,
    });
  });


  const axiosInstance = axios.create({
    httpsAgent: new https.Agent({rejectUnauthorized: true}),
    proxy: proxy ? {
      host: proxy.host,
      port: proxy.port,
      protocol: proxy.protocol,
    } : false,
  });

  const proxyUrl = process.env.PROXY_HOST
    ? `${process.env.PROXY_PROTOCOL || 'http'}://${process.env.PROXY_HOST}:${process.env.PROXY_PORT || 8080}`
    : undefined;

  if (oidc && jwksUri) {
    app.use('/api', oidcMiddleware(jwksUri, oidc.issuer, oidc.audience), buildRouter(axiosInstance, environments, proxyUrl));
  } else {
    app.use('/api', buildRouter(axiosInstance, environments, proxyUrl));
  }

  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(frontDistPath, 'index.html'));
  });

  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err.name === 'UnauthorizedError') {
      console.error('[Auth] 401:', err.code, '-', err.message);
      res.status(401).json({error: 'Unauthorized'});
      return;
    }
    next(err);
  });

  return app;
}
