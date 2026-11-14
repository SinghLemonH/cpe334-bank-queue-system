# Lab 5 Deployment Guide: Bank Branch Queue System

Version 1 (L5-2, Issue #24). This file covers the stack, configuration, and local commands. The GCP resources, first deploy, and release procedure come in later versions (L5-3 and L5-4).

## 1. Stack and differences from the reference

| Part | Reference (Lab 5 Starter Kit) | This project | Reason |
|---|---|---|---|
| Application | One container (React + Express) | **Two containers**: `queue-api` (NestJS 11) and `queue-web` (Next.js 15, standalone) | The repo is an npm-workspaces monorepo with separate apps. The web server proxies `/api/*` to the API (`API_BASE_URL`), so the browser talks to one origin and the session cookie stays first-party. |
| Database | Cloud SQL for PostgreSQL | **Supabase Postgres** (region Singapore, `ap-southeast-1`), reached through the Supavisor **session pooler** | No hourly cost on the free tier, and the data lives outside the container (R-04). Cloud Run has no IPv6 egress, and Supabase's direct host is IPv6-only, so the IPv4 pooler is used. |
| Migrations | Prisma, in a Cloud Run job | TypeORM, compiled JS (`npm run db:prepare:prod`) in a Cloud Run job | The same image as the API. No ts-node in production. |
| Runtime / registry / secrets / CI auth | Cloud Run, Artifact Registry, Secret Manager, GitHub Actions + WIF | Same | — |

Supabase safety: every table has row level security enabled with no policies (migration 001, checked by `database.smoke.spec.ts`), and the Supabase Data API is turned off. The API connects as the database owner, so RLS does not affect it.

## 2. Environment variables

The app reads only these variables. `.env.example` lists all of them with placeholder values. No real value is committed.

| Variable | Used by | Purpose | Secret? | Local value comes from | Cloud value comes from |
|---|---|---|---|---|---|
| `NODE_ENV` | api | `production` in containers; `test` is set by Jest | No | `.env` | Image default (`production`) |
| `PORT` | api, web | Listen port | No | `.env` (api 3001) / compose | Injected by Cloud Run (8080) |
| `API_BASE_URL` | web | Where the web server proxies `/api/*`, read per request | No | `.env` / compose (`http://api:3001`) | Cloud Run env var on `queue-web` (= `queue-api` URL) |
| `DATABASE_HOST` | api, migrate | Database host | No | `.env` / compose (`postgres`) | Cloud Run env var: Supabase session-pooler host |
| `DATABASE_PORT` | api, migrate | Database port | No | `.env` | Cloud Run env var: `5432` (session pooler) |
| `DATABASE_USER` | api, migrate | Database user | No | `.env` (`queue`) | Cloud Run env var: `postgres.<project-ref>` |
| `DATABASE_PASSWORD` | api, migrate | Database password | **Yes** | `.env` (synthetic `queue`) | **Secret Manager** `DATABASE_PASSWORD` |
| `DATABASE_NAME` | api, migrate | Database name | No | `.env` (`queue_dev`) | Cloud Run env var: `postgres` |
| `DATABASE_SSL` | api, migrate | Use TLS to the database | No | `.env` (`false`) | Cloud Run env var: `true` |
| `DATABASE_SSL_CA` | api, migrate | Optional PEM of the database CA; verification stays on | No (public cert) | empty | Cloud Run env var, if used (decided in L5-3) |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | api, migrate | `false` = encrypt without verifying the certificate | No | `true` | `true` when the CA is provided; otherwise documented in L5-3 |
| `DB_POOL_MAX` | api, migrate | Max DB connections per instance | No | default 30 (TEST-14 needs > 20) | Cloud Run env var: `5` |
| `SESSION_TTL_HOURS` | api | Session lifetime | No | `.env` (`8`) | Cloud Run env var: `8` |
| `COOKIE_SECURE` | api | `Secure` flag on the session cookie | No | `.env` (`false` on http) | Cloud Run env var: `true` |
| `SEED_DEMO_PASSWORD` | migrate (seed), e2e | Password the seed writes for every demo account | **Yes** in the cloud | `.env` placeholder | **Secret Manager** `SEED_DEMO_PASSWORD` (shared with the Lab 6 partner team privately) |
| `DATABASE_PORT_TEST`, `DATABASE_NAME_TEST` | Jest only | Separate test database | No | `.env` (`5433`, `queue_test`) | Not deployed; CI workflow env |

Removed in Lab 5: `SESSION_SECRET` and `WEB_PORT` were in the Sprint 1 `.env.example`, but no code read them. Sessions store a SHA-256 hash of a random token, so no signing secret is needed.

## 3. Commands

All commands run from the repository root.

### Local development (Node on the host)
```bash
cp .env.example .env
npm ci
npm run db:up          # Postgres dev (5432) + test (5433)
npm run db:migrate
npm run db:seed
npm run dev:api        # terminal 1, http://localhost:3001
npm run dev:web        # terminal 2, http://localhost:3000
```

### Build and test (the same steps CI runs)
```bash
npm run lint
npm run build
npm run db:prepare:prod --workspace=apps/api   # compiled migrations + seed
npm test                                       # Jest unit + integration, test DB on 5433
npm run test:e2e                               # Playwright
```

### Run the whole app in containers from a fresh clone (C-03)
```bash
git clone https://github.com/SinghLemonH/cpe334-bank-queue-system.git
cd cpe334-bank-queue-system
cp .env.example .env
docker compose --profile app up --build
```
Compose starts Postgres, then runs the one-shot `migrate` job (migrations + seed), then the `api` (port 3001, healthy when `/api/ready` returns 200), then `web` (port 3000). Open http://localhost:3000 and sign in as `customer1` with the `SEED_DEMO_PASSWORD` from `.env`. Stop with `docker compose --profile app down`, which keeps the dev data volume.

### Build the images alone
```bash
docker build -f apps/api/Dockerfile -t queue-api .
docker build -f apps/web/Dockerfile -t queue-web .
```
Both images use `node:24-bookworm-slim`, run as the non-root `node` user, contain no `.env` (excluded by `.dockerignore`), and listen on `PORT` (default 8080).

### Migrate and seed (Cloud Run job, L5-3)
The migration job uses the API image with the command `npm run db:prepare:prod`. That command runs `typeorm migration:run` on the compiled data source and then the idempotent seed. The seed refuses to run without `SEED_DEMO_PASSWORD`.

## 4. Health endpoints

| Endpoint | Meaning | Used by |
|---|---|---|
| `GET /api/health` | Process is up (liveness); no DB access | Smoke test |
| `GET /api/ready` | API can query the database: 200 `{status:"ready"}`, or 503 with the generic error body | Compose healthcheck, smoke test |

Through the web service, the same paths work as `https://<web-url>/api/health` and `/api/ready`.

## 5. CI

`.github/workflows/ci-docker.yml` runs on every Pull Request into `Lab5-staging` or `main`. Its job id `test-and-docker` is the required status check. The steps are: `npm ci`, lint, build, compiled migrate + seed, Jest (real PostgreSQL 17 service containers), Playwright e2e, and a Docker build of both images (no push). It uses synthetic CI-only database credentials and no repository secrets. Actions are pinned to full commit SHAs; Dependabot proposes updates weekly.

## 6. GCP Deployment & Pipeline Architecture (L5-3)

### 6.1 Google Cloud Platform Resources
- **Project ID**: Configured via environment variable (`$PROJECT_ID`)
- **Region**: `asia-southeast1` (Singapore)
- **Artifact Registry**: `queue-repo` (Docker format)
- **Cloud Run Job**: `queue-migrate` (Tasks: `npm run db:prepare:prod`, Service Account: `queue-runtime`)
- **Cloud Run Services**:
  - `queue-api`: NestJS API container, port 3001, min instances 0, max instances 2, `--allow-unauthenticated`.
  - `queue-web`: Next.js web container, port 3000, min instances 0, max instances 2, runtime `API_BASE_URL` pointing to `queue-api`, `--allow-unauthenticated`.
- **Runtime Service Account**: `queue-runtime` (Granted `roles/secretmanager.secretAccessor` on secrets only).
- **Secret Manager Secrets**:
  - `DATABASE_PASSWORD`: Supabase PostgreSQL password.
  - `SEED_DEMO_PASSWORD`: Production seed password for demo accounts.
- **CI/CD Authentication**: Workload Identity Federation (WIF) with pool `github-actions` and provider `github-main`. No JSON service account keys are stored or used.

### 6.2 First Deployment (Cloud Shell)
```bash
# 1. Preview changes (Dry-Run mode)
DRY_RUN=1 bash deploy/deploy.sh

# 2. Execute First Deployment
export SUPABASE_HOST="aws-0-ap-southeast-1.pooler.supabase.com"
export SUPABASE_PORT="5432"
export SUPABASE_USER="postgres.<your-project-ref>"
export SUPABASE_DB="postgres"
bash deploy/deploy.sh
```

### 6.3 Automated Release Pipeline & Merge Gate
- **Deploy Workflow**: `.github/workflows/deploy.yml` triggers on push to `main` (and manual `workflow_dispatch` for rollbacks).
  1. Reuses `ci-docker.yml` checks (tests & build must pass).
  2. Authenticates to GCP via WIF using GitHub environment `demo`.
  3. Builds & pushes images tagged with full 40-character commit SHA to Artifact Registry.
  4. Calls `deploy/release.sh` which deploys using immutable image digests.
  5. Updates `queue-migrate` to the new image digest and runs DB migrations.
  6. Updates `queue-api` and `queue-web` revisions by digest.
  7. Runs `deploy/smoke_test.py` to confirm `/api/health`, `/api/ready`, and `/` are healthy.
- **Rollback Mechanism**:
  - Run workflow `Deploy demo` via GitHub Actions UI (`workflow_dispatch`).
  - Provide `image_tag` (full commit SHA of a previously built release).
  - Skips CI, builds, and migrations; redeploys the previous image digest directly and smoke tests the live deployment.
- **Branch Ruleset**: `protect-main-and-staging` enforces that all PRs into `main` and `Lab5-staging` require 1 peer approval and the `test-and-docker` status check must pass before merging.

### 6.4 Release Procedure and Finding the Running Commit (L5-4)
- How to inspect running version:
  - From CLI: `gcloud run services describe queue-api --region=asia-southeast1 --format='value(spec.template.spec.containers[0].image)'`
  - In app: Public `/api/version` endpoint and footer badge displaying the commit SHA (implemented in Milestone L5-4).