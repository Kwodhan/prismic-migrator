export interface OidcConfig {
  issuer: string;
  clientId: string;
  scope: string;
}

export interface OidcClaims {
  sub: string;
  exp?: number;
  iat?: number;
  email?: string;
  name?: string;
  preferred_username?: string;
  [key: string]: unknown;
}

