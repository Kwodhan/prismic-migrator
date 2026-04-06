# ─────────────────────────────────────────────
# Stage 0 – Dependencies installation
# ─────────────────────────────────────────────
FROM node:24.14.1-trixie-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY front/package.json ./front/
COPY back/package.json ./back/

RUN npm ci && npm install lightningcss-linux-x64-gnu @tailwindcss/oxide-linux-x64-gnu



# ─────────────────────────────────────────────
# Stage 1 – Build Front (Angular)
# ─────────────────────────────────────────────
FROM deps AS build-front

WORKDIR /app/front
COPY front/ ./
# Make the shared types available at /app/shared so that front's tsconfig.app.json (which includes ../shared) can resolve them
COPY shared /app/shared
RUN npm run build


# ─────────────────────────────────────────────
# Stage 2 – Build Back (TypeScript → JS)
# ─────────────────────────────────────────────
FROM deps AS build-back

WORKDIR /app/back
COPY back/ ./
# Make the shared types available at /app/shared so that back build can import shared types if needed
COPY shared /app/shared
RUN npm run build


# ─────────────────────────────────────────────
# Stage 3 – Image finale (runtime)
# ─────────────────────────────────────────────
FROM node:24.14.1-trixie-slim AS runtime

WORKDIR /app

COPY package.json package-lock.json ./
COPY back/package.json ./back/
COPY front/package.json ./front/
RUN npm ci --omit=dev

COPY --from=build-back /app/back/dist ./
COPY --from=build-front /app/front/dist/prismic-migrator/browser ./public

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && chown -R node:node /app

USER node

EXPOSE 3001 8080

ENV APP_MODE=all

ENTRYPOINT ["/entrypoint.sh"]
