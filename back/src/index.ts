import dotenv from 'dotenv';
import path from 'node:path';
import net from 'node:net';
import validator from 'validator';
import {createApp} from './app';
import {Environment} from '@shared/types/environment.types';
import {createRoleExtractor, RoleExtractorType} from './auth/adapters';
import {RoleExtractor} from './auth/adapters/RoleExtractor';


dotenv.config({path: path.resolve(__dirname, '../../.env')});

const PORT = 3001;
const CONNECTIVITY_TIMEOUT_MS = 5000;

export type ProxyConfig = {
  host: string;
  port: number;
  protocol: string;
};

export type OidcConfig = {
  issuer: string;
  clientId: string;
  scope: string;
  audience: string;
};

export type RbacConfig = {
  roleExtractor: RoleExtractor;
};

function readEnvironments(): Environment[] {
  const environments: Environment[] = [];
  let i = 0;

  while (process.env[`ENV_${i}_REPOSITORY_NAME`]) {
    const repoName = process.env[`ENV_${i}_REPOSITORY_NAME`];
    const writeToken = process.env[`ENV_${i}_WRITE_TOKEN`];
    const contentToken = process.env[`ENV_${i}_CONTENT_TOKEN`];

    if (repoName && writeToken && contentToken) {
      environments.push({
        repoName,
        description: process.env[`ENV_${i}_DESCRIPTION`],
        writeToken,
        contentToken,
        rolePrefix: process.env[`ENV_${i}_ROLE_PREFIX`],
      });
    } else {
      console.warn(`[Config] ENV_${i} ignored: missing WRITE_TOKEN and/or CONTENT_TOKEN`);
    }
    i++;
  }

  return environments;
}

function assertMinimumEnvironments(environments: Environment[]): void {
  if (environments.length < 2) {
    console.error(`[Config] At least 2 environments are required, found ${environments.length}.`);
    process.exit(1);
  }
  console.info(`[Config] ${environments.length} environments configured.`);
}

function readOidcConfig(): OidcConfig {

  return {
    issuer: process.env.OIDC_ISSUER?.trim() ?? '',
    clientId: process.env.OIDC_CLIENT_ID?.trim() ?? '',
    scope: process.env.OIDC_SCOPE?.trim() ?? 'openid profile email',
    audience: process.env.OIDC_AUDIENCE?.trim() ?? 'prismic-migrator',
  };
}

function getProxyConfig(): ProxyConfig | undefined {
  const host = process.env.PROXY_HOST?.trim();
  if (!host) {
    return undefined;
  }

  return {
    host,
    port: Number(process.env.PROXY_PORT) || 8080,
    protocol: process.env.PROXY_PROTOCOL || 'http',
  };
}

function getRbacConfig(): RbacConfig {
  const roleExtractorType = (process.env.ROLE_EXTRACTOR) as RoleExtractorType;
  const clientId = process.env.OIDC_CLIENT_ID;
  const roleClaim = process.env.ROLE_CLAIM;

  const roleExtractor = createRoleExtractor(roleExtractorType, clientId, roleClaim);

  return {
    roleExtractor,
  };
}

async function assertProxyReachable(proxy: ProxyConfig): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({host: proxy.host, port: proxy.port});

    socket.setTimeout(CONNECTIVITY_TIMEOUT_MS);
    socket.once('connect', () => {
      socket.end();
      resolve();
    });
    socket.once('timeout', () => {
      socket.destroy();
      reject(new Error(`timeout after ${CONNECTIVITY_TIMEOUT_MS}ms`));
    });
    socket.once('error', (error) => {
      socket.destroy();
      reject(error);
    });
  });
}

async function discoverJwksUri(issuer: string): Promise<string> {
  const normalizedIssuer = issuer.replace(/\/+$/, '');
  const discoveryUrl = `${normalizedIssuer}/.well-known/openid-configuration`;
  const res = await fetch(discoveryUrl, {signal: AbortSignal.timeout(CONNECTIVITY_TIMEOUT_MS)});

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} on ${discoveryUrl}`);
  }

  const cfg = await res.json() as { jwks_uri?: string };
  if (!cfg?.jwks_uri) {
    throw new Error(`jwks_uri not found in discovery document (${discoveryUrl})`);
  }

  return cfg.jwks_uri;
}

async function bootstrap(): Promise<void> {
  const environments = readEnvironments();
  assertMinimumEnvironments(environments);

  const oidcConfig = readOidcConfig();

  let jwksUri: string | undefined;

  if (validator.isURL(oidcConfig.issuer, {
    require_protocol: true,
    protocols: ['http', 'https'],
    host_whitelist: ['localhost', '127.0.0.1', '::1'],
  })) {
    try {
      jwksUri = await discoverJwksUri(oidcConfig.issuer);
      console.info('[Auth] JWKS URI discovered:', jwksUri);
    } catch (err) {
      console.error('[Auth] Unable to reach the discovery document:', err);
      process.exit(1);
    }
  }

  const proxyConfig = getProxyConfig();
  if (proxyConfig) {
    try {
      await assertProxyReachable(proxyConfig);
      console.info(`[Proxy] Reachable: ${proxyConfig.protocol}://${proxyConfig.host}:${proxyConfig.port}`);
    } catch (err) {
      console.error('[Proxy] Unreachable proxy configuration:', err);
      process.exit(1);
    }
  }


  const authEnabled = Boolean(jwksUri);
  const rbacConfig = authEnabled ? getRbacConfig() : undefined;

  const app = createApp(environments, oidcConfig, rbacConfig, proxyConfig, jwksUri);
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

bootstrap();
