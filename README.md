# Bank Branch Queue System

Coursework project for CPE 334 Introduction to Software Engineering in the Age of AI Agents, Semester 1/2026.

Theme 9: Queue and Service Management System. Sprint 1 is a local-only vertical slice: sign in, take a ticket, and serve it at the desk. It does not move money.

## Team

| Name | Student ID | GitHub |
|---|---|---|
| Wichitchai Suwanno (Student A) | 67070503439 | SinghLemonH |
| Wathit Tritsananawakit (Student B) | 67070503495 | WATHITx |

## Prerequisites

| Tool | Version used by this repo |
|---|---|
| Node.js | 22 or 24 (`engines` in `package.json`: `>=22 <25`) |
| npm | the npm that ships with that Node |
| Docker Desktop | with Docker Compose v2 (`docker compose`) |
| PostgreSQL | 17, started by `docker-compose.yml` (`postgres:17-alpine`) |
| Git | any current version |

Copy `.env.example` to `.env`. The database password in that example is the synthetic local password `queue`. It is not a production secret.

## Environment

| Variable | Role |
|---|---|
| `PORT` | API port. Default `3001`. |
| `API_BASE_URL` | Where the Next.js proxy sends `/api/*`. Default `http://localhost:3001`. |
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` | Dev Postgres. Defaults: `localhost`, `5432`, `queue`, `queue`, `queue_dev`. |
| `DATABASE_PORT_TEST`, `DATABASE_NAME_TEST` | Test Postgres. Defaults: `5433`, `queue_test`. |
| `DATABASE_SSL` | `false` for local Docker. |
| `COOKIE_SECURE` | `false` on http://localhost. `true` only behind HTTPS. |
| `SESSION_TTL_HOURS` | Session lifetime. Default `8`. |
| `NO_SHOW_GRACE_MINUTES` | Minutes after a call before the operator may mark no-show (F-05, BR-12). Whole number, `0` or more. Default `2`. |
| `PRIORITY_AGE` | Minimum age on the Bangkok queue date for the `PRIORITY` lane (F-09, BR-15). Whole number, `1` or more. Default `60`. |
| `PRIORITY_STREAK_LIMIT` | Consecutive `PRIORITY` calls before one `REGULAR` ticket is called when both lanes have waiting customers (F-09, BR-14). Whole number, `1` or more. Default `3`. |
| `SEED_DEMO_PASSWORD` | Password the seed command writes for every demo account. Set it in `.env` before `npm run db:seed`. The README does not treat the placeholder in `.env.example` as a published password; change it if you want. |

Sessions store a SHA-256 hash of a random token, so there is no session signing secret. Lab 5 adds `DB_POOL_MAX` and the `DATABASE_SSL_*` options; the full list, and which values are secret in the cloud, is in [docs/labs/lab05/deployment.md](docs/labs/lab05/deployment.md).

To run the whole app in Docker from a fresh clone: `cp .env.example .env` then `docker compose --profile app up --build`, and open http://localhost:3000.

## Database

```bash
docker compose up -d
npm install
npm run db:migrate
```

Set `SEED_DEMO_PASSWORD` in `.env`, then:

```bash
npm run db:seed
```

The seed creates three open queues (D Deposit & Withdrawal, L Loans, O Account Opening) and these usernames. Every one of them gets the password currently in `SEED_DEMO_PASSWORD`.

| Username | Role | Queue |
|---|---|---|
| customer1, customer2, customer3, customer4 | CUSTOMER | none |
| teller1, teller2 | OPERATOR | D |
| loanofficer1 | OPERATOR | L |
| accountofficer1 | OPERATOR | O |

`npm run db:reset` truncates the dev tables. Seed again afterwards. Tests use the separate database on port 5433 and do not need the seed.

If port 5432 is already taken, set `DATABASE_PORT` (and the same variable for Compose) to a free port, for example `5434`.

## Run

Two terminals, from the repository root:

```bash
npm run dev:api
npm run dev:web
```

Open http://localhost:3000 . The web app proxies `/api` to the API.

Build check:

```bash
npm run build
```

## Demo (five steps)

1. `npm run db:reset` then `npm run db:seed` so the queues are empty.
2. Sign in as `customer1`.
3. On Service queues, join Deposit & Withdrawal. The app opens My ticket and shows `D001`, Waiting, and People ahead: 0.
4. Sign out. Sign in as `teller1`. On the service desk, Call next, then Start, then Complete.
5. Sign in as `customer1` again. My ticket shows Completed within one refresh (the page polls every 5 seconds).

## Tests

API and unit tests (Jest, real Postgres on port 5433):

```bash
npm test
```

Browser tests (Playwright). Reset and seed the dev database first, and export `SEED_DEMO_PASSWORD` with the same value the seed used:

```bash
npm run db:reset
npm run db:seed
npm run test:e2e
```

`npm run evidence` runs the API Jest suite and prints the AC to test to file to result table, plus `git rev-parse HEAD` and `node -v`. It writes `docs/sprints/sprint-1/evidence/results.json`, which is gitignored. The numbers that belong in the Deliverable 1 PDF are the ones produced by running this command, `npm run build`, and `npm run test:e2e` on a fresh clone of tag `v0.1.0-sprint1`. Do not commit that output.

Playwright covers TEST-08, TEST-18 and TEST-30. Those three are not inside the Jest JSON. Their log from the tagged clone is attached to the GitHub Release together with the Jest log.
