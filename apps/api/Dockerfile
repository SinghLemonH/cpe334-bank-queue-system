# syntax=docker/dockerfile:1
# NestJS API image. Build from the repository root (npm workspaces):
#   docker build -f apps/api/Dockerfile -t queue-api .
# The same image runs the API (default CMD) and the migration job:
#   docker run ... queue-api npm run db:prepare:prod
# Every setting comes from the environment (see .env.example and docs/labs/lab05/deployment.md).

# ---- build: install all deps for the api workspace and compile TypeScript ----
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace=apps/api --include-workspace-root=false
COPY apps/api apps/api
RUN npm run build --workspace=apps/api

# ---- runtime: production deps + compiled JS only, non-root ----
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace=apps/api --include-workspace-root=false --omit=dev \
 && npm cache clean --force
COPY --from=build /app/apps/api/dist apps/api/dist
WORKDIR /app/apps/api
USER node
EXPOSE 8080
CMD ["node", "dist/src/main.js"]
