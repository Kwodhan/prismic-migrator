import { expressjwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import type { Request, Response, NextFunction } from 'express';

// ─── Factory ──────────────────────────────────────────────────────────────────
// jwksUri est résolu au démarrage (index.ts) et passé explicitement,
// sans mutation de process.env.
export function oidcMiddleware(jwksUri: string) {
  const middleware = expressjwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      cacheMaxAge: 600_000, // 10 min
      jwksUri,
    }) as jwksRsa.GetVerificationKey,
    issuer:   process.env.OIDC_ISSUER   ?? '',
    algorithms: ['RS256', 'ES256'],
  });

  return (req: Request, res: Response, next: NextFunction) => middleware(req, res, next);
}
