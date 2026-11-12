# syntax=docker/dockerfile:1
# Next.js web image (standalone output). Build from the repository root (npm workspaces):
#   docker build -f apps/web/Dockerfile -t queue-web .
# Runtime settings: API_BASE_URL (where /api/* is proxied, read per request) and PORT.

# ---- build ----
FROM node:24-bookworm-slim AS build
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace=apps/web --include-workspace-root=false
COPY apps/web apps/web
RUN npm run build --workspace=apps/web

# ---- runtime: only the traced standalone server, non-root ----
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 8080
CMD ["node", "apps/web/server.js"]
