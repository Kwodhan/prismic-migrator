import dotenv from 'dotenv';
import path from 'node:path';
import axios from 'axios';
import https from 'node:https';
import {createApp} from './app';

dotenv.config({path: path.resolve(__dirname, '../../.env')});

const PORT = 3001;

async function bootstrap(): Promise<void> {

  let jwksUri: string | undefined;
  const issuer = process.env.OIDC_ISSUER;
  if (issuer) {

    try {
      const res = await fetch(`${issuer}/.well-known/openid-configuration`);
      const cfg = res.ok ? await res.json() as { jwks_uri?: string } : null;
      jwksUri = cfg?.jwks_uri;
      if (!jwksUri) {
        console.error(`[Auth] jwks_uri introuvable dans le discovery document (HTTP ${res.status})`);
        process.exit(1);
      }
      console.info('[Auth] JWKS URI découvert :', jwksUri);
    } catch (err) {
      console.error('[Auth] Impossible de joindre le discovery document :', err);
      process.exit(1);
    }

  }

  console.log('[Proxy] host:', process.env.PROXY_HOST);

  const axiosInstance = axios.create({
    httpsAgent: new https.Agent({rejectUnauthorized: false}),
    proxy: process.env.PROXY_HOST ? {
      host: process.env.PROXY_HOST,
      port: Number(process.env.PROXY_PORT) || 8080,
      protocol: process.env.PROXY_PROTOCOL || 'http',
    } : false,
  });

  const proxyUrl = process.env.PROXY_HOST
    ? `${process.env.PROXY_PROTOCOL || 'http'}://${process.env.PROXY_HOST}:${process.env.PROXY_PORT || 8080}`
    : undefined;

  const app = createApp(axiosInstance, proxyUrl, jwksUri);
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

bootstrap();
