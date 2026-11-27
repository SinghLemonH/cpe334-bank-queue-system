# Requirements Traceability Matrix: Bank Branch Queue System

Version 2.0 (27 Nov 2026; 1.2 26 Nov 2026; 1.1 7 Nov 2026). Version 2.0 is the Deliverable 2 baseline: one matrix for all 36 requirements with the Sprint 2 and Sprint 3 acceptance criteria, the actual test files, and the result of the last executed run. Version 1.2 recorded Lab 7 CR-01 (BR-02 v2, AC-12 v2). Requirement definitions are in `docs/srs.md`; feature descriptions and status are in `docs/features.md`.

## 1. How to read this document

- Every requirement (FR-01..FR-13, BR-01..BR-16, NFR-01..NFR-07) has one row in section 2, including requirements that are not implemented yet.
- **AC and TEST IDs** are paired one to one (`AC-NN` is verified by `TEST-NN`). Unit tests (UT-NN) support an AC. E2E-01..E2E-04 are Playwright tests titled TEST-08, TEST-18/TEST-30, TEST-36 and TEST-49.
- **Result** comes only from an executed run. Status words: **Planned** (designed, not run), **Implemented** (code and test exist, not yet run in a recorded run), **Passed**, **Failed**, **Manual check** (verified by inspection, no executable test), **Accepted** (known limitation accepted by the team). A test is never reported as Passed without a run.
- The runs behind the Result column:

| Run | Commit | What ran | Counts |
|---|---|---|---|
| R2 Sprint 2 release regression (27 Nov 2026) | `sprint-2-staging` `d8df396` + version bump (`caec619`), released as `v0.4.0-sprint2` (`8c5f638`) | `npm run evidence` (Jest), `npm run build`, `npm run test:e2e` (Playwright) | Jest 19 suites, 180 passed / 0 failed / 0 skipped; Playwright 14 / 0 / 0 |
| CI on PR #56 (27 Nov 2026) | `172f887` (F-09 head, merged into `sprint-3-staging` as `932962a`) | CI job `test-and-docker`: build, all Jest tests, Docker images | success |
| Local pre-release run (27 Nov 2026) | `sprint-3-staging` `932962a` + branch `docs/rc1-baseline` (this document and the `0.5.0-rc1` version label; no feature code) | `npm run evidence`, `npm run build`, `npm run test:e2e` on a freshly migrated and seeded database; Node v24.14.0, PostgreSQL 17 | Jest 22 suites, 195 passed / 0 failed / 0 skipped; build passed; Playwright 14 / 0 / 0 |
| R3 rc1 run | `v0.5.0-rc1` | CI on the release PR and the deploy | **filled after the tag** (docs-only commit, see section 7) |

- **Version** is the release in which the requirement's behavior first shipped (later changes in brackets). `v0.5.0-rc1` means planned for the release candidate.

## 2. Requirement to feature to sprint to verification

### 2.1 Functional requirements

| Requirement | Feature / responsibility | Sprint | AC or NFR verification | Planned test | Actual file / test | Result | Version |
|---|---|---|---|---|---|---|---|
| FR-01 | F-01 Auth and RBAC | 1 | AC-01..AC-05, AC-08 | TEST-01..TEST-05, TEST-08 (E2E-01) | `f01-auth.spec.ts`; `e2e/auth.spec.ts` | Passed (R2) | `v0.1.0-sprint1` |
| FR-02 | F-02 Join queue | 1 | AC-09, AC-10, AC-17, AC-18; AC-56 (Sprint 3) | TEST-09, TEST-10, TEST-17, TEST-18; TEST-56 | `f02-join-queue.spec.ts`; `e2e/sprint1-journey.spec.ts`; `f09-priority.spec.ts` | Passed (R2); TEST-56 Passed (CI PR #56) | `v0.1.0-sprint1` (join DTO in `v0.5.0-rc1`) |
| FR-03 | F-02 Join queue | 1 | AC-10, AC-16, AC-18 | TEST-10, TEST-16, TEST-18 | `f02-join-queue.spec.ts`; `e2e/sprint1-journey.spec.ts` | Passed (R2) | `v0.1.0-sprint1` |
| FR-04 | F-03 Service desk | 1 | AC-20, AC-21, AC-28, AC-30; AC-45 (v2) | TEST-20, TEST-21, TEST-28, TEST-30, TEST-45; UT-04 | `f03-service-desk.spec.ts`; `fifo-ordering-policy.spec.ts`; `e2e/sprint1-journey.spec.ts`; `f07-counters.spec.ts` | Passed (R2) | `v0.1.0-sprint1` (v2 in `v0.4.0-sprint2`) |
| FR-05 | F-03 Service desk | 1 | AC-25, AC-28, AC-30 | TEST-25, TEST-28, TEST-30 | `f03-service-desk.spec.ts`; `e2e/sprint1-journey.spec.ts` | Passed (R2) | `v0.1.0-sprint1` |
| FR-06 | F-04 Customer cancel | 2 | AC-31..AC-36 | TEST-31..TEST-36 (E2E-03) | `f04-cancel.spec.ts`; `e2e/sprint2-cancel.spec.ts` | Passed (R2) | `v0.4.0-sprint2` |
| FR-07 | F-05 No-show | 2 | AC-37..AC-41 | TEST-37..TEST-41, UT-05 | `f05-no-show.spec.ts`; `no-show-rule.spec.ts`; TEST-41 manual | AC-37..AC-40 Passed (R2); AC-41 Planned (manual on the deployed release) | `v0.4.0-sprint2` |
| FR-08 | F-06 Public board | 2 | AC-47..AC-49 | TEST-47..TEST-49 (E2E-04) | `f06-board.spec.ts`; `e2e/sprint2-board.spec.ts` | Passed (R2) | `v0.4.0-sprint2` |
| FR-09 | F-07 Counters (+ F-03 v2) | 2 | AC-42..AC-46, AC-49 | TEST-42..TEST-46, TEST-49 | `f07-counters.spec.ts`; `e2e/sprint2-board.spec.ts` | Passed (R2) | `v0.4.0-sprint2` |
| FR-10 | F-09 Priority lane | 3 | AC-55..AC-60 | TEST-55..TEST-60, UT-07, UT-08 | `f09-priority.spec.ts`; `priority-age.spec.ts`; `priority-ordering-policy.spec.ts`; TEST-60 manual | AC-55..AC-59 Passed (CI PR #56); AC-60 Planned (manual on rc1) | `v0.5.0-rc1` |
| FR-11 | F-10 Service summary | 3 | AC-61..AC-65 | TEST-61..TEST-65 | not written (`f10-summary.spec.ts` planned) | Planned | `v1.0.0` |
| FR-12 | F-08 Open/close, end-of-day | 2 | AC-50..AC-54 | TEST-50..TEST-54 | `f08-open-close.spec.ts`; TEST-54 manual | AC-50..AC-53 Passed (R2); AC-54 Planned (manual on the deployed release) | `v0.4.0-sprint2` |
| FR-13 | F-03 Service desk | 1 | AC-19, AC-30 | TEST-19, TEST-30 | `f03-service-desk.spec.ts`; `e2e/sprint1-journey.spec.ts` | Passed (R2) | `v0.1.0-sprint1` |

### 2.2 Business rules

| Requirement | Feature / responsibility | Sprint | AC or NFR verification | Planned test | Actual file / test | Result | Version |
|---|---|---|---|---|---|---|---|
| BR-01 | F-02 | 1 | AC-10, AC-14, AC-15 | TEST-10, TEST-14, TEST-15, UT-02, UT-03 | `f02-join-queue.spec.ts`; `display-number.spec.ts`; `queue-date.spec.ts` | Passed (R2) | `v0.1.0-sprint1` |
| BR-02 v2 | F-02 (Lab 7 CR-01) | 1 | AC-11, AC-12 v2; AC-35 | TEST-11 (TDD), TEST-12 v2, TEST-35 | `f02-join-queue.spec.ts`; `f04-cancel.spec.ts` | Passed (R2) | `v0.1.0-sprint1` (v2 in `v0.3.0-lab7`) |
| BR-03 | F-03; F-09 for the lane order | 1 | AC-20, AC-24 | TEST-20, TEST-24, UT-04 | `f03-service-desk.spec.ts`; `fifo-ordering-policy.spec.ts` | Passed (R2); TEST-20, TEST-24 also Passed with `PriorityOrderingPolicy` (CI PR #56) | `v0.1.0-sprint1` |
| BR-04 (state machine v2) | F-03; F-04, F-05, F-08 | 1, 2 | AC-26; AC-33, AC-40, AC-52 | TEST-26 (TDD), UT-01; TEST-33, TEST-40, TEST-52, UT-06 | `f03-service-desk.spec.ts`; `entry-status.spec.ts`; `f04-cancel.spec.ts`; `f05-no-show.spec.ts`; `f08-open-close.spec.ts` | Passed (R2) | `v0.1.0-sprint1` (v2 in `v0.4.0-sprint2`) |
| BR-05 | F-03 | 1 | AC-19, AC-23 | TEST-19, TEST-23 | `f03-service-desk.spec.ts` | Passed (R2) | `v0.1.0-sprint1` |
| BR-06 | F-03 | 1 | AC-22; AC-32 | TEST-22, TEST-32 | `f03-service-desk.spec.ts`; `f04-cancel.spec.ts` | Passed (R2) | `v0.1.0-sprint1` |
| BR-07 | F-03; F-05 | 1 | AC-24, AC-27; AC-39 | TEST-24, TEST-27, TEST-39 | `f03-service-desk.spec.ts`; `f05-no-show.spec.ts` | Passed (R2) | `v0.1.0-sprint1` |
| BR-08 | F-02 (data model) | 1 | Inspection of migrations 001 and 002 and the entry and board responses; TEST-48 asserts the board keys | Manual check; TEST-48 | migrations; `f06-board.spec.ts` | Manual check; TEST-48 Passed (R2) | `v0.1.0-sprint1` |
| BR-09 | F-02; F-08 | 1 | AC-13; AC-50, AC-51 | TEST-13, TEST-50, TEST-51 | `f02-join-queue.spec.ts`; `f08-open-close.spec.ts` | Passed (R2) | `v0.1.0-sprint1` |
| BR-10 | F-02 | 1 | AC-15 | TEST-15, UT-03 | `f02-join-queue.spec.ts`; `queue-date.spec.ts` | Passed (R2) | `v0.1.0-sprint1` |
| BR-11 | F-04 | 2 | AC-31..AC-35 | TEST-31..TEST-35 | `f04-cancel.spec.ts` | Passed (R2) | `v0.4.0-sprint2` |
| BR-12 | F-05 | 2 | AC-37, AC-38 (TDD) | TEST-37, TEST-38, UT-05 | `f05-no-show.spec.ts`; `no-show-rule.spec.ts`; red/green in `docs/sprints/sprint-2/evidence/` | Passed (R2) | `v0.4.0-sprint2` |
| BR-13 | F-07 | 2 | AC-42, AC-43 (TDD), AC-44 | TEST-42..TEST-44 | `f07-counters.spec.ts`; red/green in `docs/sprints/sprint-2/evidence/` | Passed (R2) | `v0.4.0-sprint2` |
| BR-14 | F-09 | 3 | AC-57 (TDD), AC-58, AC-59 | TEST-57..TEST-59, UT-08 | `f09-priority.spec.ts`; `priority-ordering-policy.spec.ts`; red/green in `docs/sprints/sprint-3/evidence/` | Passed (CI PR #56) | `v0.5.0-rc1` |
| BR-15 | F-09 | 3 | AC-55, AC-56 | TEST-55, TEST-56, UT-07 | `f09-priority.spec.ts`; `priority-age.spec.ts` | Passed (CI PR #56) | `v0.5.0-rc1` |
| BR-16 | F-08 | 2 | AC-52 | TEST-52, UT-06 | `f08-open-close.spec.ts`; `entry-status.spec.ts` | Passed (R2); DEF-02 Accepted (known limitation) | `v0.4.0-sprint2` |

### 2.3 Non-functional requirements

| Requirement | Feature / responsibility | Sprint | AC or NFR verification | Planned test | Actual file / test or measurement | Result | Version |
|---|---|---|---|---|---|---|---|
| NFR-01 | F-01; every feature adds rows; F-11 sweep | 1 (2, 3) | AC-03, AC-06; Sprint 2 rows; AC-66 | TEST-03, TEST-06 (table-driven), TEST-66 | `f01-auth.spec.ts`; `test/helpers/protected-endpoints.ts` (Sprint 1 + 5 Sprint 2 rows) | TEST-03, TEST-06 Passed (R2); TEST-66 Planned | `v0.1.0-sprint1` |
| NFR-02 | F-01 | 1 | AC-07 | TEST-07 | `f01-auth.spec.ts` | Passed (R2) | `v0.1.0-sprint1` |
| NFR-03 | F-02 | 1 | AC-14 | TEST-14 | `f02-join-queue.spec.ts` | Passed (R2) | `v0.1.0-sprint1` |
| NFR-04 | F-03 (local); system on GCP; F-11 | 1, 2 (3) | AC-29; deployed persistence check; AC-68 | TEST-29; persistence ticket from `v0.4.0-sprint2` checked on rc1 with `GET /api/entries/:id`; TEST-68 | `f03-service-desk.spec.ts`; deployed check (evidence in the D2 PDF) | TEST-29 Passed (R2); GCP check Planned (on rc1); TEST-68 Planned | `v0.1.0-sprint1` (GCP: `v0.2.0-lab5`) |
| NFR-05 | F-06 | 2 | AC-48 | TEST-48 | `f06-board.spec.ts` | Passed (R2) | `v0.4.0-sprint2` |
| NFR-06 | F-11 | 3 | AC-67 | TEST-67 (`scripts/latency.mjs`, 50 customers) | not written | Planned | `v1.0.0` |
| NFR-07 | F-01; release checklist | 1 | Review checklist and repository search at each release | Manual check | DoD checklist; `.env.example` | Manual check (each release) | `v0.1.0-sprint1` |

## 3. Acceptance criteria to requirements

### 3.1 Sprint 1 (AC-01..AC-30)

| AC | Expected outcome (summary) | Requirement(s) | Feature | Level | Planned test |
|---|---|---|---|---|---|
| AC-01 | Valid login: 200, HttpOnly SameSite=Lax cookie, body without password hash | FR-01 | F-01 | API | TEST-01 |
| AC-02 | Wrong password or unknown username: identical 401, no cookie | FR-01 | F-01 | API | TEST-02 |
| AC-03 | GET /me with valid cookie: 200; missing or garbage cookie: 401 | FR-01, NFR-01 | F-01 | API | TEST-03 |
| AC-04 | Logout: 204, session row deleted, old cookie then 401 | FR-01 | F-01 | API | TEST-04 |
| AC-05 | Expired session: 401 and row removed | FR-01 | F-01 | API | TEST-05 |
| AC-06 | Every protected endpoint without cookie: 401, body only {error} | NFR-01 | F-01 | API | TEST-06 |
| AC-07 | Stored password starts with $argon2id$ and is not the plaintext | NFR-02 | F-01 | Integration | TEST-07 |
| AC-08 | UI: anonymous redirect to /login, role-based landing, logout | FR-01 | F-01 | E2E-01 | TEST-08 |
| AC-09 | GET /api/queues returns code, name, isOpen, waitingCount | FR-02 | F-02 | API | TEST-09 |
| AC-10 | Join open queue D: 201, D001, WAITING, REGULAR, peopleAhead, row in DB; a body cannot choose the lane or customer (400 since F-09, AC-56) | FR-02, FR-03, BR-01 | F-02 | API | TEST-10 |
| AC-11 | Second active join to same queue: 409 DUPLICATE_ACTIVE_ENTRY (TDD) | BR-02 | F-02 | API | TEST-11 |
| AC-12 v2 | Customer active in D today joins L: 409 DUPLICATE_ACTIVE_ENTRY (v1: both 201). COMPLETED or yesterday's entry does not block. | BR-02 v2 | F-02 | API | TEST-12 v2 |
| AC-13 | Join closed queue: 409 QUEUE_CLOSED, no row, counter unchanged | BR-09 | F-02 | API | TEST-13 |
| AC-14 | 20 concurrent joins: seq 1..20, no duplicates | BR-01, NFR-03 | F-02 | API | TEST-14 |
| AC-15 | First entry of a Bangkok date is 001; next date restarts; queues independent | BR-01, BR-10 | F-02 | API + UT-02, UT-03 | TEST-15 |
| AC-16 | GET entry: own 200, other customer 404, operator 403 | FR-03 | F-02 | API | TEST-16 |
| AC-17 | Operator joining a queue: 403 FORBIDDEN | FR-02 | F-02 | API | TEST-17 |
| AC-18 | UI: join from /queues, /my-ticket shows number, status, people ahead, 5 s refresh, friendly duplicate message | FR-02, FR-03 | F-02 | E2E-02 | TEST-18 |
| AC-19 | GET operator/queues (assigned only, waiting counts) and current-entry | FR-13, BR-05 | F-03 | API | TEST-19 |
| AC-20 | Call-next: lowest-seq WAITING becomes CALLED with operator and called_at | FR-04, BR-03 | F-03 | API + UT-04 | TEST-20 |
| AC-21 | Call-next with nothing waiting: 409 NO_WAITING_ENTRY | FR-04 | F-03 | API | TEST-21 |
| AC-22 | Call-next while holding an entry: 409 OPERATOR_BUSY | BR-06 | F-03 | API | TEST-22 |
| AC-23 | teller1 call-next on queue L: 403 FORBIDDEN | BR-05 | F-03 | API | TEST-23 |
| AC-24 | Two operators call-next concurrently: different entries, or one gets 409 | BR-03, BR-07 | F-03 | API | TEST-24 |
| AC-25 | Start (CALLED to SERVING) and complete (SERVING to COMPLETED); customer sees status | FR-05 | F-03 | API | TEST-25 |
| AC-26 | Invalid transitions: 409 INVALID_TRANSITION, row unchanged (TDD) | BR-04 | F-03 | API + UT-01 | TEST-26 |
| AC-27 | Another operator starts or completes: 403 NOT_ENTRY_OWNER | BR-07 | F-03 | API | TEST-27 |
| AC-28 | Customer calls call-next, start or complete: 403 | FR-04, FR-05 | F-03 | API | TEST-28 |
| AC-29 | After restarting the API app against the same DB, COMPLETED is still returned | NFR-04 | F-03 | Integration | TEST-29 |
| AC-30 | UI: /operator shows queues, state-based actions, restores current entry after refresh | FR-04, FR-05, FR-13 | F-03 | E2E-02 | TEST-30 |

Unit tests: UT-01 transition table (AC-26), UT-02 display number (AC-15), UT-03 `queueDate()` at Bangkok midnight (AC-15), UT-04 `FifoOrderingPolicy` (AC-20). TDD: AC-11 (BR-02) and AC-26 (BR-04).

### 3.2 Sprint 2 (AC-31..AC-54)

Contracts: `docs/sprints/sprint-2/README.md`; tests: `docs/sprints/sprint-2/sts.md`; per-AC commits: `docs/sprints/sprint-2/completion.md`.

| AC | Expected outcome (summary) | Requirement(s) | Feature | Level | Test | Result |
|---|---|---|---|---|---|---|
| AC-31 | Customer cancels own WAITING entry: CANCELLED, `endedAt` set, people ahead of others drops | FR-06, BR-11 | F-04 | API | TEST-31 | Passed (R2) |
| AC-32 | Cancelling a CALLED entry frees the operator (call-next works, not OPERATOR_BUSY) | FR-06, BR-06 | F-04 | API | TEST-32 | Passed (R2) |
| AC-33 | Cancel of SERVING, COMPLETED, CANCELLED: 409 INVALID_TRANSITION, row unchanged | BR-04, BR-11 | F-04 | API + UT-06 | TEST-33 | Passed (R2) |
| AC-34 | Another customer's entry: 404; operator: 403; no session: 401 (TEST-06 row) | BR-11, NFR-01 | F-04 | API | TEST-34 | Passed (R2) |
| AC-35 | After cancelling, the customer joins again (new number) | BR-02 v2 | F-04 | API | TEST-35 | Passed (R2) |
| AC-36 | UI: Cancel ticket on `/my-ticket` shows the cancelled card | FR-06 | F-04 | E2E-03 | TEST-36 | Passed (R2) |
| AC-37 | No-show at exactly the grace period: NO_SHOW, operator freed | FR-07, BR-12 | F-05 | API | TEST-37 | Passed (R2) |
| AC-38 ★TDD | No-show 1 s before the grace period: 409 NO_SHOW_TOO_EARLY, row unchanged | BR-12 | F-05 | API + UT-05 | TEST-38 | Passed (R2) |
| AC-39 | No-show by another operator, unassigned operator or customer: 403 | BR-07, NFR-01 | F-05 | API | TEST-39 | Passed (R2) |
| AC-40 | No-show of WAITING, SERVING, COMPLETED: 409 INVALID_TRANSITION | BR-04 | F-05 | API + UT-06 | TEST-40 | Passed (R2) |
| AC-41 | UI: No-show button with the "available from" hint | FR-07 | F-05 | Manual | TEST-41 | Planned (manual on the deployed release) |
| AC-42 | Call-next with a counter records it; `counterLabel` in the entry | FR-09, BR-13 | F-07 | API | TEST-42 | Passed (R2) |
| AC-43 ★TDD | A counter with a CALLED or SERVING entry: 409 COUNTER_BUSY | BR-13 | F-07 | API | TEST-43 | Passed (R2) |
| AC-44 | Counter of another queue or unknown: 404; malformed or extra field: 400 | FR-09 | F-07 | API | TEST-44 | Passed (R2) |
| AC-45 | Call-next without a body behaves as in Sprint 1 (`counterLabel: null`) | FR-04 | F-03 v2 | API | TEST-45 | Passed (R2) |
| AC-46 | `GET /api/queues/:code/counters`: assigned 200; others 403 | FR-09, NFR-01 | F-07 | API | TEST-46 | Passed (R2) |
| AC-47 | Board without login: waiting counts, today's CALLED and SERVING with counter labels | FR-08 | F-06 | API | TEST-47 | Passed (R2) |
| AC-48 | Board keys exactly as the contract; no ids, usernames or names | NFR-05, BR-08 | F-06 | API | TEST-48 | Passed (R2) |
| AC-49 | UI: operator calls at Counter 2 and anonymous `/board` shows it | FR-08, FR-09 | F-06, F-07 | E2E-04 | TEST-49 | Passed (R2) |
| AC-50 | Close queue: join 409 QUEUE_CLOSED; reopen: join 201 | FR-12, BR-09 | F-08 | API | TEST-50 | Passed (R2) |
| AC-51 | Closed queue: existing entries can still be called, started, completed | BR-09 | F-08 | API | TEST-51 | Passed (R2) |
| AC-52 | End-of-day: today's WAITING and CALLED → EXPIRED; SERVING, finished and earlier days unchanged; queue closed | FR-12, BR-16 | F-08 | API + UT-06 | TEST-52 | Passed (R2) |
| AC-53 | Unassigned operator or customer: 403; bad body: 400; unknown queue: 404 | FR-12, NFR-01 | F-08 | API | TEST-53 | Passed (R2) |
| AC-54 | UI: close/open and End of day on `/operator` | FR-12 | F-08 | Manual | TEST-54 | Planned (manual on the deployed release) |

### 3.3 Sprint 3 (AC-55..AC-70)

Contracts: `docs/sprints/sprint-3/README.md`; tests: `docs/sprints/sprint-3/sts.md`.

| AC | Expected outcome (summary) | Requirement(s) | Feature | Level | Test | Result |
|---|---|---|---|---|---|---|
| AC-55 | Fixed Clock: turns 60 today → PRIORITY; turns 60 tomorrow → REGULAR | FR-10, BR-15 | F-09 | API + UT-07 | TEST-55 | Passed (CI PR #56) |
| AC-56 | Join with `{ "lane": "PRIORITY" }`: 400, no entry; join with no body: 201 | BR-15 | F-09 | API | TEST-56 | Passed (CI PR #56) |
| AC-57 ★TDD | R1, P1, R2, P2 → called P1, P2, R1, R2 | FR-10, BR-14 | F-09 | API + UT-08 | TEST-57 | Passed (CI PR #56); red `7a22d8c`, green `46f959f` |
| AC-58 | P1..P4, R1, R2 → P1, P2, P3, R1, P4, R2 (limit 3) | BR-14 | F-09 | API + UT-08 | TEST-58 | Passed (CI PR #56) |
| AC-59 | Two operators call concurrently: distinct entries, no 500, order still holds | BR-14 | F-09 | API | TEST-59 | Passed (CI PR #56) |
| AC-60 | UI: Priority badge on `/my-ticket`, `/operator`, `/board` | FR-10 | F-09 | Manual | TEST-60 | Planned (manual on rc1) |
| AC-61..AC-65 | Service summary numbers, empty range, validation, access, UI | FR-11 | F-10 | API, E2E or manual | TEST-61..TEST-65 | Planned |
| AC-66 | Access sweep over every endpoint of Sprints 1 to 3 | NFR-01 | F-11 | API | TEST-66 | Planned |
| AC-67 | p95 join latency < 500 ms over 50 joins by 50 customers | NFR-06 | F-11 | Measurement | TEST-67 | Planned |
| AC-68 | Entry survives the next redeploy (`GET /api/entries/:id`) | NFR-04 | F-11 | Deployed check | TEST-68 | Planned |
| AC-69 | Loading, empty and error states on every screen | (UX, ui-spec 5) | F-11 | Manual | TEST-69 | Planned |
| AC-70 | Final regression on `v1.0.0` | all | F-11 | CI | TEST-70 | Planned |

## 4. Coverage summary

| Measure | Count |
|---|---|
| Requirements (13 FR, 16 BR, 7 NFR) | 36 |
| Allocated to a feature and a sprint | 36 (21 Sprint 1, 10 Sprint 2, 5 Sprint 3) |
| Acceptance criteria defined | 70 (AC-01..AC-70) |
| AC with an automated test that passed in a recorded run | 57 (Sprint 1: 30; Sprint 2: 22; Sprint 3: 5, AC-55..AC-59) |
| AC planned as manual checks on a deployed release | 3 (AC-41, AC-54, AC-60) |
| AC not implemented yet | 10 (AC-61..AC-70) |
| Requirements with every planned verification passed | 28 |
| Requirements partly verified (a manual UI check or a deployed check still open) | 5 (FR-07, FR-10, FR-12, NFR-01 sweep, NFR-04 on GCP) |
| Requirements not implemented yet | 2 (FR-11, NFR-06) |
| Requirements verified by manual check only | 1 (NFR-07); BR-08 is an inspection plus TEST-48 and is counted in the 28 |

## 5. Coverage gaps and approved changes

### 5.1 Coverage gaps (shown explicitly)

| Item | Gap | Handling |
|---|---|---|
| FR-11 (F-10 service summary) | Not implemented; AC-61..AC-65 Planned | Contract and STS exist; planned for 30 Nov (`docs/sprints/sprint-3/remaining-work.md`) |
| NFR-06 (latency) | Not measured; AC-67 Planned | `scripts/latency.mjs` with 50 test customers, planned for 30 Nov |
| NFR-01 full sweep | TEST-06 covers every Sprint 1 and Sprint 2 protected endpoint; the role and owner sweep for all endpoints (AC-66) is Planned | F-11, after F-10 adds its endpoint |
| NFR-04 on GCP | Persistence across the rc1 redeploy is checked after the rc1 deploy; AC-68 for the final release | Evidence in the D2 PDF; TEST-68 on `v1.0.0` |
| AC-41, AC-54, AC-60 (UI) | Manual checks, not automated | Run on the deployed release and recorded in the sprint `evidence/manual-checks.md`; their rules are covered by passing API and unit tests |
| AC-69 (error and empty states) | Planned | F-11 checklist |
| BR-08 (no financial or national-ID data) | No dedicated executable AC | Inspection of migrations 001 and 002 and the response shapes; TEST-48 asserts the board keys |
| NFR-07 (no secrets in Git) | No executable AC | Review checklist and repository search at each release |
| DEF-02 (join during end-of-day) | One WAITING entry may remain | Accepted known limitation; workaround: run end-of-day again (`docs/known-limitations.md`) |

### 5.2 Approved changes

| Date | Change | Reason | Affected IDs | Approved by |
|---|---|---|---|---|
| 26 Nov 2026 | Lab 7 CR-01: BR-02 v2, one active ticket per customer per day across queues | Tickets in two queues are called at two counters at once | BR-02, D-03, F-02, AC-12 v2, TEST-12 v2 | Both students (Lab 7 PR #43) |
| 27 Nov 2026 | F-03 contract v2: optional `counterId` on call-next (D-22) | FR-09 needs the counter; Sprint 1 tests stay valid | F-03, F-07, AC-42..AC-46, TEST-45 | Both students (PR #51 contracts) |
| 27 Nov 2026 | Entry response v2 adds `counterLabel` (D-30); TEST-10 key set updated | FR-09 | F-02, F-03, AC-10, TEST-10 | Both students (PR #51, #52) |
| 27 Nov 2026 | End-of-day scope (D-27), `ended_at` on terminal transitions (D-28), error codes (D-29) | BR-16, FR-11, UI messages | F-04, F-05, F-08 | Both students (PR #51) |
| 27 Nov 2026 | Join rejects any body field with 400 (`JoinQueueDto`); TEST-10 now expects 400 for `{ lane, customerId }` (was 201 with the fields ignored) | BR-15: a client field must not be able to set the lane | F-02, F-09, AC-10, AC-56, TEST-10, TEST-56 | Both students (PR #51 contract, PR #56) |
| 27 Nov 2026 | People ahead v2 (SRS A-06) | Priority lane changes call order | F-02, F-09 | Both students (PR #51) |
| 27 Nov 2026 | Branches and tags (D-25, D-26); Sprint 2 built 26–27 Nov instead of 9–23 Nov | Lab work used the earlier time | plan, releases | Both students (`docs/sprints/plan.md` section 10) |

## 6. Test files

| AC | TEST | File |
|---|---|---|
| AC-01..AC-07 | TEST-01..TEST-07 | `apps/api/test/integration/f01-auth.spec.ts` |
| AC-08 | TEST-08 | `apps/web/e2e/auth.spec.ts` |
| AC-09..AC-17 | TEST-09..TEST-17 (TEST-12 v2) | `apps/api/test/integration/f02-join-queue.spec.ts` |
| AC-15 | UT-02, UT-03 | `apps/api/test/unit/display-number.spec.ts`, `queue-date.spec.ts` |
| AC-18, AC-30 | TEST-18, TEST-30 | `apps/web/e2e/sprint1-journey.spec.ts` |
| AC-19..AC-29 | TEST-19..TEST-29 | `apps/api/test/integration/f03-service-desk.spec.ts` |
| AC-20 | UT-04 | `apps/api/test/unit/fifo-ordering-policy.spec.ts` |
| AC-26, AC-33, AC-40, AC-52 | UT-01, UT-06 | `apps/api/test/unit/entry-status.spec.ts` |
| AC-06 and Sprint 2 rows | TEST-06 | `apps/api/test/helpers/protected-endpoints.ts` (used by `f01-auth.spec.ts`) |
| AC-31..AC-35 | TEST-31..TEST-35 | `apps/api/test/integration/f04-cancel.spec.ts` |
| AC-36 | TEST-36 (E2E-03) | `apps/web/e2e/sprint2-cancel.spec.ts` |
| AC-37..AC-40 | TEST-37..TEST-40 | `apps/api/test/integration/f05-no-show.spec.ts` |
| AC-38 | UT-05 | `apps/api/test/unit/no-show-rule.spec.ts` |
| AC-42..AC-46 | TEST-42..TEST-46 | `apps/api/test/integration/f07-counters.spec.ts` |
| AC-47, AC-48 | TEST-47, TEST-48 | `apps/api/test/integration/f06-board.spec.ts` |
| AC-49 | TEST-49 (E2E-04) | `apps/web/e2e/sprint2-board.spec.ts` |
| AC-50..AC-53 | TEST-50..TEST-53 | `apps/api/test/integration/f08-open-close.spec.ts` |
| AC-41, AC-54 | TEST-41, TEST-54 (manual) | `docs/sprints/sprint-2/evidence/manual-checks.md` |
| AC-55..AC-59 | TEST-55..TEST-59 | `apps/api/test/integration/f09-priority.spec.ts` |
| AC-55 | UT-07 | `apps/api/test/unit/priority-age.spec.ts` |
| AC-57, AC-58 | UT-08 | `apps/api/test/unit/priority-ordering-policy.spec.ts` |
| AC-60 | TEST-60 (manual) | `docs/sprints/sprint-3/evidence/manual-checks.md` |
| Lab 6 #39, #40 | regression | `apps/web/e2e/lab6-mobile-layout.spec.ts` |
| Lab 5 R-08 | version footer | `apps/web/e2e/version.spec.ts`, `apps/api/test/version.spec.ts` |

TDD logs: Sprint 1 `docs/sprints/sprint-1/evidence/TEST-11-*.txt`, `TEST-26-*.txt`; Sprint 2 `docs/sprints/sprint-2/evidence/TEST-38-*.txt`, `TEST-43-*.txt`; Sprint 3 `docs/sprints/sprint-3/evidence/TEST-57-*.txt`; Lab 7 `docs/labs/lab07/evidence/TEST-12-v2-*.txt`.

## 7. Recording the rc1 results

The Result column above shows the last recorded run before the release candidate. After the `v0.5.0-rc1` tag, the results of the CI run on the tagged commit (and the manual checks AC-41, AC-54, AC-60 and the GCP persistence check) are recorded in a **docs-only commit on `sprint-3-staging`**, which is not merged into `main` before submission. `git diff v0.5.0-rc1 <that commit> -- apps/` is then empty, which shows the code under test is the tagged code.
