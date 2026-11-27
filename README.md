# Bank Branch Queue System

Coursework project for CPE 334 Introduction to Software Engineering in the Age of AI Agents, Semester 1/2026.

Theme 9: Queue and Service Management System. A bank branch waiting line: customers take a ticket, operators call and serve it at a named counter, and a public board shows who is being served. It manages the line only and does not move money.

## Releases

| Tag | Content | Status |
|---|---|---|
| `v0.1.0-sprint1` | Sprint 1: sign in, join a queue, call, start, complete (F-01..F-03) | released |
| `v0.2.0-lab5`, `v0.3.0-lab7` | Lab 5 Docker, CI/CD and GCP deploy; Lab 6 fixes; Lab 7 one active ticket per customer | released |
| `v0.4.0-sprint2` | Sprint 2: cancel, no-show, public board, counters, open/close and end-of-day (F-04..F-08) | released, deployed |
| `v0.5.0-rc1` | Deliverable 2 release candidate: adds the priority lane for seniors (F-09) | release candidate |
| `v1.0.0` | Final: service summary (F-10) and hardening (F-11) | planned, 13 Dec 2026 |

The running version and commit are shown in the footer of every page and by `GET /api/version`. Deployment details: [docs/labs/lab05/deployment.md](docs/labs/lab05/deployment.md). What is not done yet: [docs/known-limitations.md](docs/known-limitations.md) and [docs/sprints/sprint-3/remaining-work.md](docs/sprints/sprint-3/remaining-work.md).

## Documentation

| Document | Content |
|---|---|
| [docs/srs.md](docs/srs.md) | Requirements (FR, BR, NFR), decisions D-01..D-30, open questions |
| [docs/features.md](docs/features.md) | Features F-01..F-11 and their status |
| [docs/system-sds.md](docs/system-sds.md) | Architecture, data model, transactions, API, security, deployment |
| [docs/traceability.md](docs/traceability.md) | Requirement → feature → sprint → AC → test → result |
| `docs/sprints/sprint-N/` | Contracts (README), test specification (sts), definition of done, evidence |

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

The seed creates three queues (D Deposit & Withdrawal, L Loans, O Account Opening), four counters (D: Counter 1 and Counter 2; L: Counter 3; O: Counter 4) and these usernames. Every one of them gets the password currently in `SEED_DEMO_PASSWORD`. The seed can be re-run safely: a new queue starts open, and an existing queue keeps its open or closed state (the deploy job runs the seed on every deploy).

| Username | Role | Queue | Lane when joining |
|---|---|---|---|
| customer1 (born 1948), customer4 (born 1950) | CUSTOMER | none | PRIORITY (age 60 or more) |
| customer2 (born 1995), customer3 (born 2001) | CUSTOMER | none | REGULAR |
| teller1, teller2 | OPERATOR | D | |
| loanofficer1 | OPERATOR | L | |
| accountofficer1 | OPERATOR | O | |

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

## Screens

| Path | Who | What |
|---|---|---|
| `/login` | anyone | Sign in |
| `/queues` | customer | Queue list with waiting counts and Join |
| `/my-ticket` | customer | Ticket card: number, status, people ahead, counter, Priority badge; Cancel ticket |
| `/operator` | operator | Assigned queues, counter selector, Call next, Start, Complete, No-show; Close/Open queue and End of day |
| `/board` | anyone, no sign-in | Public board: numbers being served with counter labels, waiting counts; no names |

## Demo

1. `npm run db:reset` then `npm run db:seed` so the queues are empty.
2. Sign in as `customer2` and join Deposit & Withdrawal: My ticket shows `D001`, Waiting, People ahead: 0. Sign out.
3. Sign in as `customer1` and join Deposit & Withdrawal: `D002` with a Priority badge. Sign out.
4. Open `/board` in a private window (no sign-in needed).
5. Sign in as `teller1`, choose Counter 1 and press Call next: `D002` (priority) is called before `D001`, and the board shows it at Counter 1. Then Start and Complete.
6. Call next again for `D001`. To try no-show, wait 2 minutes (`NO_SHOW_GRACE_MINUTES`) and press No-show; to try cancel, sign in as the customer and press Cancel ticket on My ticket.
7. Close or open a queue, or run End of day, from the queue controls on the service desk.

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

`npm run evidence` runs the API Jest suite and prints the AC to test to file to result table, plus `git rev-parse HEAD` and `node -v`. It writes `docs/sprints/sprint-1/evidence/results.json`, which is gitignored. The numbers that belong in a deliverable PDF are the ones produced by running this command, `npm run build`, and `npm run test:e2e` on the tagged commit (or the CI run of that commit). Do not commit that output.

Playwright covers TEST-08 (E2E-01), TEST-18 and TEST-30 (E2E-02), TEST-36 (E2E-03, cancel), TEST-49 (E2E-04, board), the Lab 6 mobile layout checks and the version footer. They are not inside the Jest JSON. TEST-41, TEST-54 and TEST-60 are manual checks on the deployed release (`docs/sprints/sprint-2/evidence/manual-checks.md`, `docs/sprints/sprint-3/evidence/manual-checks.md`).

## Setup summary

| Step | Command or place |
|---|---|
| Configuration | `.env` from `.env.example`; variables in the Environment table above; in the cloud, secrets come from Secret Manager (`docs/labs/lab05/deployment.md`) |
| Database | `docker compose up -d` (PostgreSQL 17) |
| Migrate and seed | `npm run db:migrate` (migrations 001 and 002), `npm run db:seed` |
| Run | `npm run dev:api`, `npm run dev:web`; or the whole app in Docker: `docker compose --profile app up --build` |
| Test | `npm test` (Jest), `npm run test:e2e` (Playwright), `npm run build` |
| CI | GitHub Actions `test-and-docker` on pull requests into `sprint-2-staging`, `sprint-3-staging` and `main` |
| Deploy | Merging into `main` deploys both services to Cloud Run; the deploy job runs migrate and seed first |

## Branches

Work branches start from the current sprint staging branch (`sprint-3-staging` now) and are merged by a reviewed pull request with a merge commit. A release PR merges the staging branch into `main`, then an annotated tag is pushed.
