import {expressjwt} from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import type {NextFunction, Request, Response} from 'express';

export function oidcMiddleware(jwksUri: string) {
  const audience = process.env.OIDC_AUDIENCE;
  const middleware = expressjwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      cacheMaxAge: 600_000, // 10 min
      jwksUri,
    }) as jwksRsa.GetVerificationKey,
    issuer: process.env.OIDC_ISSUER ?? '',
    audience: audience,
    algorithms: ['RS256', 'ES256'],
  });

  return (req: Request, res: Response, next: NextFunction) => middleware(req, res, next);
}
