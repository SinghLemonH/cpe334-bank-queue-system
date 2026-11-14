# Lab 5 Deployment Guide: Bank Branch Queue System

Version 3 (L5-4). Stack and configuration (L5-2), GCP resources and pipeline (L5-3), release procedure and how to find the running commit (L5-4).

| Item | Value |
|---|---|
| GCP project | `cpe334-bankqueue` (owner: WATHITx, editor: SinghLemonH) |
| Region | `asia-southeast1` |
| Public URL (web) | https://queue-web-5dckavoyda-as.a.run.app |
| API URL | https://queue-api-5dckavoyda-as.a.run.app |
| Running commit | https://queue-web-5dckavoyda-as.a.run.app/api/version |

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
| `PORT` | api, web | Listen port | No | `.env` (api 3001) / compose | Injected by Cloud Run from `--port` (api 3001, web 3000) |
| `API_BASE_URL` | web | Where the web server proxies `/api/*`, read per request | No | `.env` / compose (`http://api:3001`) | Cloud Run env var on `queue-web` (= `queue-api` URL) |
| `DATABASE_HOST` | api, migrate | Database host | No | `.env` / compose (`postgres`) | Cloud Run env var: Supabase session-pooler host |
| `DATABASE_PORT` | api, migrate | Database port | No | `.env` | Cloud Run env var: `5432` (session pooler) |
| `DATABASE_USER` | api, migrate | Database user | No | `.env` (`queue`) | Cloud Run env var: `postgres.<project-ref>` |
| `DATABASE_PASSWORD` | api, migrate | Database password | **Yes** | `.env` (synthetic `queue`) | **Secret Manager** `DATABASE_PASSWORD` |
| `DATABASE_NAME` | api, migrate | Database name | No | `.env` (`queue_dev`) | Cloud Run env var: `postgres` |
| `DATABASE_SSL` | api, migrate | Use TLS to the database | No | `.env` (`false`) | Cloud Run env var: `true` |
| `DATABASE_SSL_CA` | api, migrate | Optional PEM of the database CA; verification stays on | No (public cert) | empty | Not set yet |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | api, migrate | `false` = encrypt without verifying the certificate | No | `true` | `false` (set by `release.sh`): the Supabase pooler certificate chains to Supabase's own CA, which is not in Node's store. Traffic is still encrypted. Known limitation; the fix is to set `DATABASE_SSL_CA` to Supabase's CA and remove this flag |
| `DB_POOL_MAX` | api, migrate | Max DB connections per instance | No | default 30 (TEST-14 needs > 20) | Cloud Run env var: `5` |
| `SESSION_TTL_HOURS` | api | Session lifetime | No | `.env` (`8`) | Cloud Run env var: `8` |
| `COOKIE_SECURE` | api | `Secure` flag on the session cookie | No | `.env` (`false` on http) | Cloud Run env var: `true` |
| `SEED_DEMO_PASSWORD` | migrate (seed), e2e | Password the seed writes for every demo account | **Yes** in the cloud | `.env` placeholder | **Secret Manager** `SEED_DEMO_PASSWORD` (shared with the Lab 6 partner team privately) |
| `GIT_SHA` | api | Full commit SHA reported by `GET /api/version` and shown in the footer | No | empty (API reports `local`) | Set by `release.sh` to the deployed commit on both services |
| `DATABASE_PORT_TEST`, `DATABASE_NAME_TEST` | Jest only | Separate test database | No | `.env` (`5433`, `queue_test`) | Not deployed; CI workflow env |

`release.sh` also sets `APP_TIMEZONE=Asia/Bangkok`, which the code does not read (the queue date is fixed to Asia/Bangkok in the `Clock`); it is harmless. GitHub environment `demo` holds `SUPABASE_HOST` and `SUPABASE_USER` as secrets and the four `GCP_*` / `WIF_*` values as variables.

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
| `GET /api/version` | Release name and full commit SHA (`GIT_SHA`), public | Footer on every page, smoke test (must equal the deployed commit) |

Through the web service, the same paths work as `https://<web-url>/api/health` and `/api/ready`.

## 5. CI

`.github/workflows/ci-docker.yml` runs on every Pull Request into `Lab5-staging` or `main`. Its job id `test-and-docker` is the required status check. The steps are: `npm ci`, lint, build, compiled migrate + seed, Jest (real PostgreSQL 17 service containers), Playwright e2e, and a Docker build of both images (no push). It uses synthetic CI-only database credentials and no repository secrets. Actions are pinned to full commit SHAs; Dependabot proposes updates weekly.

## 6. GCP Deployment & Pipeline Architecture (L5-3)

### 6.1 Google Cloud Platform Resources
- **Project ID**: `cpe334-bankqueue` (scripts read it from `$PROJECT_ID` / `$GCP_PROJECT_ID`)
- **Budget**: alerts-only, ฿350/month (≈ USD 10), alerts at 50/90/100% of actual cost, Free Trial credits excluded so usage is visible
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
  7. Runs `deploy/smoke_test.py` to confirm `/api/health`, `/api/ready`, and `/` are healthy, and that `/api/version` reports exactly the deployed commit (`EXPECTED_COMMIT`).
- **Rollback Mechanism**:
  - Run workflow `Deploy demo` via GitHub Actions UI (`workflow_dispatch`).
  - Provide `image_tag` (full commit SHA of a previously built release).
  - Skips CI, builds, and migrations; redeploys the previous image digest directly and smoke tests the live deployment.
- **Branch Ruleset**: `protect-main-and-staging` enforces that all PRs into `main` and `Lab5-staging` require 1 peer approval and the `test-and-docker` status check must pass before merging.

### 6.4 Release Procedure (R-07, R-08)

Only `main` deploys, so every merge into `main` is a release. Repeat these steps for every release:

1. **Issue.** Open an Issue with the label `lab-5` (later labs: their own label), add it to the project board, and assign an author.
2. **Branch.** Create `feature/...` or `fix/...` from `Lab5-staging`.
3. **Pull Request into `Lab5-staging`.** Fill in the PR template (tests run, evidence). CI `test-and-docker` must pass. The teammate reviews and writes a specific check or finding (R-09); authors never approve their own PR. Merge with **Create a merge commit**.
4. **Release Pull Request `Lab5-staging` → `main`.** Title `Release vX.Y.Z: ...`, list the PRs it contains and the test results. CI runs again, the teammate approves, then merge with **Create a merge commit**.
5. **Pipeline.** The merge starts **Actions → Deploy demo**: CI again, build both images tagged with the full merge commit SHA, push, run `queue-migrate`, deploy `queue-api` and `queue-web` by digest, smoke test (fails if `/api/version` does not report the merge commit).
6. **Tag.** On the merge commit:
   ```bash
   git checkout main && git pull
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   ```
   and bump `APP_VERSION` in `apps/api/src/presentation/version.controller.ts` in the next release PR.
7. **Check.** Open the public URL: the footer shows `vX.Y.Z · <first 7 characters of the SHA>`; take the evidence screenshots.

### 6.5 Finding the Commit That Is Running

All three must show the same SHA:

| Where | How |
|---|---|
| Live app | `https://queue-web-5dckavoyda-as.a.run.app/api/version` returns `{"version":"…","commit":"<full SHA>"}`; every page footer shows `v<version> · <short SHA>` (hover shows the full SHA) |
| Cloud Run | `gcloud run services describe queue-api --region=asia-southeast1 --format='value(spec.template.spec.containers[0].env)'` lists `GIT_SHA`; the revision image is the digest of `queue-api:<SHA>` in Artifact Registry |
| GitHub | The **Deploy demo** run for the merge commit; its summary prints the deployed SHA |

Images are tagged with the full commit SHA and deployed by digest, so a tag cannot silently point at a different build.

### 6.6 Rollback and Roll Forward

1. **Actions → Deploy demo → Run workflow** on `main`, `image_tag` = full SHA of the last good release.
2. The run skips CI, build, and migration, deploys that image by digest, and smoke tests it (`/api/version` must report that SHA). Only images from v0.2.0-lab5 onward have `/api/version`, so roll back no further than that.
3. Roll forward by merging the fix through the normal procedure (6.4). Migrations are additive, so the schema is not rolled back.

### 6.7 Cost Control and Teardown

- Cloud Run `min-instances=0`, `max-instances=2` on both services; Supabase free tier has no hourly charge.
- Keep the service and the Supabase project running until grading ends. Supabase pauses a free project after 7 days without activity, so open the app at least every few days.
- After the course: `bash deploy/teardown.sh` (Cloud Run, job, images, secrets), then delete the Supabase project by hand.