# Prismic Migrator [![CI](https://img.shields.io/github/actions/workflow/status/Kwodhan/prismic-migrator/docker-publish.yml?label=CI)](https://github.com/Kwodhan/prismic-migrator/actions/workflows/docker-publish.yml) [![Docker Hub](https://img.shields.io/docker/pulls/kwodhan/prismic-migrator?label=Docker+Hub)](https://hub.docker.com/r/kwodhan/prismic-migrator)

[![License: WTFPL v2](https://img.shields.io/badge/License-WTFPL%20v2-blue.svg)](LICENSE.md)
[![Release](https://img.shields.io/github/v/release/Kwodhan/prismic-migrator)](https://github.com/Kwodhan/prismic-migrator/releases)
[![Snyk Back Report](https://img.shields.io/badge/Vulnerability%20Back%20Report-4C4A73?logo=snyk&logoColor=white)](https://snyk.io/test/github/Kwodhan/prismic-migrator?targetFile=back/package.json)
[![Snyk Front Report](https://img.shields.io/badge/Vulnerability%20Front%20Report-4C4A73?logo=snyk&logoColor=white)](https://snyk.io/test/github/Kwodhan/prismic-migrator?targetFile=front/package.json)



A full-stack web application to migrate content between [Prismic](https://prismic.io) repositories - assets, custom types and documents - through a visual drag-and-drop interface.


---

## Overview

When working with multiple Prismic environments (e.g. staging → production), migrating content manually is tedious and error-prone. **Prismic Migrator** provides a unified UI to browse repositories side by side and migrate items with a single drag-and-drop, with built-in validation, conflict detection and auto-fix.

---

## Features

### 🖼️ Assets
- Browse source and target asset libraries with infinite scroll
- Drag an asset from source to target to trigger migration
- Open any asset directly in Prismic (new tab)
- Duplicate detection: if an asset already exists in the target, it is skipped

### 🧩 Custom Types
- Browse active custom types (status: `true`) from both repositories
- Drag a custom type from source to target to trigger migration
- **Diff on conflict**: if the custom type already exists in the target, a diff dialog (powered by `jsondiffpatch`) shows the exact changes before you confirm the update
- Open any custom type directly in Prismic (new tab)

### 📄 Documents
- Browse documents from both repositories with infinite scroll
- Filter documents by type using a searchable dropdown (types fetched from the source repository)
- Drag a document from source to target to trigger migration
- **Validation pipeline** runs before and after migration (see below)
- Open any document directly in Prismic Migration Builder (new tab)
- URL-persisted filters (type filter is kept in the query string on navigation)
- Don't forget that migrated documents appear in the **"Migration release"** of the target repository, not in the regular document list!

---

## Authentication (OIDC)

Prismic Migrator supports **optional OpenID Connect (OIDC) authentication**. When configured, all API routes are protected and the front-end redirects unauthenticated users to the identity provider.

### Environment variables

| Variable | Description                                                                        |
|---|------------------------------------------------------------------------------------|
| `OIDC_ISSUER` | Base URL of the identity provider (e.g. `https://sso.example.com/realms/my-realm`) |
| `OIDC_CLIENT_ID` | OIDC client ID registered in the IdP                                               |
| `OIDC_SCOPE` | Space-separated scopes (default: `openid profile email`)                           |
| `OIDC_AUDIENCE` | Expected `aud` claim in the access token (default: `prismic-migrator`).            |

> The IdP must expose `{OIDC_ISSUER}/.well-known/openid-configuration` and support the **Authorization Code Flow** with `RS256` or `ES256` tokens.

---

## Authorization (RBAC) *(optional)*

On top of OIDC authentication, Prismic Migrator supports **Role-Based Access Control (RBAC)** to restrict which environments a user can access and with which permissions.

RBAC is fully optional: if no `ENV_N_ROLE_PREFIX` is set for an environment, that environment is open to any authenticated user.

---

### How it works

Each API route requires one or more **permissions**. Before fulfilling the request, the middleware:

1. Extracts the roles embedded in the user's JWT access token.
2. Looks up the roles that match the target environment's **role prefix**.
3. Checks that at least one of those roles matches the required permission.

#### Available permissions

| Permission | Grants access to |
|---|---|
| `Read` | Browsing environments, listing resources |
| `Asset` | Asset migration |
| `CustomType` | Custom type migration |
| `Document` | Document migration |

#### Role naming convention

Roles follow the pattern `<rolePrefix><separator><permission>`.

For exemple, with the separator `_` and a role prefix of `app_dev`:

```
app_dev_read        → Read access on the "app_dev" environment
app_dev_asset       → Asset migration on the "app_dev" environment
app_dev_customtype  → Custom-type migration on the "app_dev" environment
app_dev_document    → Document migration on the "app_dev" environment
```

A user holding `app_dev_read` and `app_prod_read` can browse both environments but cannot migrate anything.

---

### Keycloak setup *(recommended)*

Set `ROLE_EXTRACTOR=keycloak` (this is also the default when OIDC is enabled).

The extractor reads roles from the standard Keycloak claim:

```
resource_access.<OIDC_CLIENT_ID>.roles
```

**Steps in Keycloak:**

1. Open your realm → **Clients** → select your client (`OIDC_CLIENT_ID`).
2. Go to **Roles** → create one role per environment/permission combination:
   - `app-dev-read`, `app-dev-asset`, `app-prod-read`, …
3. Assign the roles to users or groups via **Users** → **Role mapping** → **Client roles**.

**Environment variables:**

| Variable | Description                                      | Default |
|---|--------------------------------------------------|---|
| `ROLE_EXTRACTOR` | Must be `keycloak`                               | `keycloak` |
| `OIDC_CLIENT_ID` | Client ID — used as the key in `resource_access` | *(required for OIDC)* |
| `ENV_N_ROLE_PREFIX` | Role prefix for environment N (e.g. `app-dev`)   | *(required)* |

**.env example:**

```env
ROLE_EXTRACTOR=keycloak

ENV_0_REPOSITORY_NAME=my-staging-repo
ENV_0_ROLE_PREFIX=app_staging

ENV_1_REPOSITORY_NAME=my-production-repo
ENV_1_ROLE_PREFIX=app_prod
```

---

### Generic IdP setup

For identity providers that expose roles as a flat array in a custom JWT claim, set `ROLE_EXTRACTOR=generic`.

**Environment variables:**

| Variable | Description | Default |
|---|---|---|
| `ROLE_EXTRACTOR` | Must be `generic` | `keycloak` |
| `ROLE_CLAIM` | JWT claim containing the flat role array | `roles` |
| `ROLE_SEPARATOR` | Separator between prefix and permission in role names | `_` |
| `ENV_N_ROLE_PREFIX` | Role prefix for environment N | *(required)* |

**Expected token structure** (with `ROLE_CLAIM=roles`, `ROLE_SEPARATOR=_`):

```json
{
  "sub": "user-id",
  "roles": ["app_staging_read", "app_staging_document", "app_prod_read"]
}
```

**.env example:**

```env
ROLE_EXTRACTOR=generic
ROLE_CLAIM=roles
ROLE_SEPARATOR=_

ENV_0_REPOSITORY_NAME=my-staging-repo
ENV_0_ROLE_PREFIX=app_staging

ENV_1_REPOSITORY_NAME=my-production-repo
ENV_1_ROLE_PREFIX=app_prod
```

---

## Document Migration & Validation Pipeline

Document migration is the most complex operation. Before sending a document to the [Prismic Migration API](https://prismic.io/docs/migration-api-technical-reference), the application runs a **validation pipeline** that inspects the document and collects issues.

### Validation Pipeline

Each validator runs in parallel and produces a list of `ValidationIssue` objects:

| Validator | Severity | What it checks | Auto-fixable |
|---|---|---|---|
| `CustomTypeValidator` | **BLOCKING** | The document's custom type exists in the target repository | ✗ |
| `ExactlySameDocumentValidator` | **BLOCKING** | The document already exists with identical data in the target | ✗ |
| `SameUIDDocumentValidator` | **BLOCKING** | The document's UID is already used by a different document in the target | ✗ |
| `SameStateCustomType` | **BLOCKING** | The custom type structure differs between source and target | ✗ |
| `AssetValidator` | WARNING | All image fields and rich-text images reference assets present in the target | ✓ |
| `LinkDocumentValidator` | WARNING | All content relationship fields point to documents that exist in the target | ✓ |
| `LinkMediaValidator` | WARNING | All media links reference assets present in the target | ✓ |

### Severity levels

- **BLOCKING** — migration is refused. The issue must be resolved manually before retrying (e.g. migrate the custom type first, or resolve the UID conflict).
- **WARNING** — migration can proceed, but some references may be broken. The pipeline will attempt to auto-fix them.

### Auto-fix strategy

| Validator | Fix behaviour |
|---|---|
| `AssetValidator` | Matches source asset filename against the target library. If found, updates image fields (including thumbnails) with target URLs. If not found, clears the field. |
| `LinkDocumentValidator` | Looks up the linked document in the target by `uid`. If found, updates the relationship field. For documents without `uid`, falls back to an exact content match within the same type. If no match, clears the field. |
| `LinkMediaValidator` | Matches source media filename against the target asset library. If not found, clears the link. |

### Validation result dialog

After migration, a result dialog shows:
- ✅ Success or ❌ failure
- The full list of issues with severity, fix status and fix description
- A direct link to the Prismic Migration Builder of the target repository

---

## Tech stack

| Layer | Technology |
|---|---|
| Front-end | Angular 21, Angular Material, Tailwind CSS |
| Back-end | Node.js, Express 5, TypeScript |
| Authentication | `oidc-client-ts` (front), `express-jwt` + `jwks-rsa` (back) |
| Prismic SDK | `@prismicio/client` |
| Monorepo | npm workspaces |

---

## Getting started

### Prerequisites

- Node.js ≥ 20
- At least two Prismic repositories with write & content API tokens

### Configuration

Copy `.env.example` to `.env` and fill in the values:

```env
# Optional proxy (e.g. corporate network)
PROXY_HOST=
PROXY_PORT=
PROXY_PROTOCOL=

# Optional OIDC authentication
OIDC_ISSUER=
OIDC_CLIENT_ID=
OIDC_SCOPE=openid profile email
OIDC_AUDIENCE=prismic-migrator

# Optional RBAC (requires OIDC). Values: keycloak (default) | generic
ROLE_EXTRACTOR=keycloak
# ROLE_CLAIM=roles         # generic only — JWT claim holding the role array
# ROLE_SEPARATOR=_         # generic only — separator between prefix and permission

# Repositories — add as many ENV_N_* blocks as needed (0-indexed)
ENV_0_REPOSITORY_NAME=my-staging-repo
ENV_0_DESCRIPTION=Staging
ENV_0_WRITE_TOKEN=
ENV_0_CONTENT_TOKEN=
# ENV_0_ROLE_PREFIX=app-staging   # optional — restricts access via RBAC

ENV_1_REPOSITORY_NAME=my-production-repo
ENV_1_DESCRIPTION=Production
ENV_1_WRITE_TOKEN=
ENV_1_CONTENT_TOKEN=
# ENV_1_ROLE_PREFIX=app-prod      # optional — restricts access via RBAC
```

> You can declare as many environments as needed by incrementing the index (`ENV_0_*`, `ENV_1_*`, `ENV_2_*`, …). The app reads them all at startup.

### Run in development

```bash
npm install
npm run dev
```

- Front-end: [http://localhost:4200](http://localhost:4200)
- Back-end API: [http://localhost:3001/api](http://localhost:3001/api)

---

## Docker

The project ships with a multi-stage `Dockerfile` that builds both front and back and packages them into a single image.

### Build

```bash
docker build -t prismic-migrator .
```

### Run

```bash
# Back + Front served together on port 3001 (default)
docker run -p 3001:3001 --env-file .env prismic-migrator

# Back only (API)
docker run -p 3001:3001 -e APP_MODE=back --env-file .env prismic-migrator

# Front only (static, port 8080)
docker run -p 8080:8080 -e APP_MODE=front prismic-migrator
```


## Project structure

```
prismic-migrator/
├── back/               # Express API (TypeScript)
│   └── src/
│       ├── asset/
│       ├── custom-type/
│       └── document/
│           └── validation/
│               └── validators/   # CustomType / Asset / LinkDocument / LinkMedia
├── front/              # Angular application
│   └── src/app/
│       ├── components/
│       ├── pages/
│       └── services/
├── shared/
│   └── types/          # Shared TypeScript types (front ↔ back)
├── Dockerfile
├── entrypoint.sh
└── .env.example
```
