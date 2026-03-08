# Prismic Migrator

A full-stack web application to migrate content between two [Prismic](https://prismic.io) repositories — assets, custom types and documents — through a visual drag-and-drop interface.

---

## Overview

When working with multiple Prismic environments (e.g. staging → production), migrating content manually is tedious and error-prone. **Prismic Migrator** provides a unified UI to browse both repositories side by side and migrate items with a single drag-and-drop, with built-in validation and conflict detection.

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

---

## Document Migration & Validation Report

Document migration is the most complex operation. Before sending a document to the [Prismic Migration API](https://prismic.io/docs/migration-api), the application runs a **validation pipeline** that inspects the document and collects issues.

### Validation Pipeline

Each validator runs in parallel and produces a list of `ValidationIssue` objects:

| Validator | Severity | What it checks | Auto-fixable |
|---|---|---|---|
| `CustomTypeValidator` | **BLOCKING** | The document's custom type exists in the target repository | ✗ |
| `AssetValidator` | WARNING | All image fields and rich text images reference assets present in the target | ✓ |
| `LinkDocumentValidator` | WARNING | All content relationship fields point to documents that exist in the target | ✓ |
| `LinkMediaValidator` | WARNING | All media links reference assets present in the target | ✓ |

### Severity levels

- **BLOCKING** — migration is refused. The issue must be resolved manually before retrying (e.g. migrate the custom type first).
- **WARNING** — migration can proceed, but some references may be broken. The pipeline will attempt to auto-fix them.

### Auto-fix strategy

Before submitting the document, the pipeline runs a `fix` pass on each validator:

- **AssetValidator fix** — resolves missing images by matching the source asset filename against the target asset library. If a match is found, the image field (including thumbnails) is updated with the target asset URL. If no match is found, the field is cleared.
- **LinkDocumentValidator fix** — checks whether the linked document exists in the target by `uid`. If found, the relationship field is updated with the target document reference.
- **LinkMediaValidator fix** — resolves missing media links by filename match in the target asset library. If no match is found, the link is cleared.

### Migration result dialog

After migration, a **result dialog** shows:
- ✅ Success or ❌ failure
- The full list of issues with their severity, fix status and fix description
- A direct link to the Prismic Migration Builder of the target repository

---

## Tech stack

| Layer | Technology |
|---|---|
| Front-end | Angular 21, Angular Material, Tailwind CSS |
| Back-end | Node.js, Express 5, TypeScript |
| Prismic SDK | `@prismicio/client` |
| Diff | `jsondiffpatch` |
| Monorepo | npm workspaces |

---

## Getting started

### Prerequisites

- Node.js ≥ 20
- Two Prismic repositories (source & destination)
- Write tokens for both repositories
- Content API tokens for both repositories

### Configuration

Copy `.env.example` to `.env` and fill in the values:

```env
# Optional proxy (e.g. corporate network)
PROXY_HOST=
PROXY_PORT=
PROXY_PROTOCOL=

# Source repository
SOURCE_REPOSITORY_NAME=
SOURCE_WRITE_TOKEN=
SOURCE_CONTENT_TOKEN=

# Destination repository
DESTINATION_REPOSITORY_NAME=
DESTINATION_WRITE_TOKEN=
DESTINATION_CONTENT_TOKEN=
```

### Run in development

```bash
npm install
npm run dev
```

- Front-end: [http://localhost:4200](http://localhost:4200)
- Back-end API: [http://localhost:3001](http://localhost:3001)

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

### Environment variables (runtime)

| Variable | Default | Description |
|---|---|---|
| `APP_MODE` | `all` | Launch mode: `all` \| `back` \| `front` |

> The `.env` file is never copied into the image. Secrets are injected at runtime via `--env-file` or `-e`.

---

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
├── Dockerfile
├── entrypoint.sh
└── .env.example
```

