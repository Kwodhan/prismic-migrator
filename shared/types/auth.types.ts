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

export type Permission = 'Read' | 'Asset' | 'CustomType' | 'Document';
export const PERMISSIONS = ['Read', 'Asset', 'CustomType', 'Document'] as const satisfies Permission[];

export type RolesMap = Record<string, Permission[]>;
