# Sprint 1 Engineering Contracts (Part E)

**Status:** Contract set v1 - 2026-11-06 - GitHub Issue #5 (plan Issue 2), branch `docs/sprint-1-contracts`
**Author:** WATHITx (Student B) - **Reviewer:** SinghLemonH (Student A)
**Sprint goal:** a working vertical slice with authentication, permissions, persistence and the core queue rules (F-01, F-02, F-03).
**Baseline:** written against `sprint-1-staging` at `f00b40f` (baseline docs merged in PR #14, scaffold merged in PR #12).

> **Issue numbering:** every `#N` in these files is a **GitHub** number. Mapping from the plan numbers (same as `docs/sprints/plan.md` section 1):
>
> | Plan Issue | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
> |---|---|---|---|---|---|---|---|
> | GitHub Issue | #4 | #5 | #6 | #7 | #9 | #10 | #11 |
> | Work | baseline docs | **these contracts** | scaffold | F-01 | F-02 | F-03 | release |

These files are the contract for Sprint 1. **No implementation commit for F-01, F-02 or F-03 may land before this PR is merged into `sprint-1-staging`.** The merge commit of this PR is the "pre-implementation history" evidence for Part E.

## 1. Files in this folder

| File | Content | Used by |
|---|---|---|
| [README.md](README.md) | Index, shared conventions, scaffold alignment, change procedure | everyone |
| [F-01-auth.md](F-01-auth.md) | F-01 Auth & RBAC: feature SDS, UI/API/data spec, AC-01..AC-08 | Issue #7 |
| [F-02-join-queue.md](F-02-join-queue.md) | F-02 Join queue & my ticket: feature SDS, UI/API/data spec, AC-09..AC-18 | Issue #9 |
| [F-03-service-desk.md](F-03-service-desk.md) | F-03 Operator service desk: feature SDS, UI/API/data spec, AC-19..AC-30 | Issue #10 |
| [sts.md](sts.md) | Software Test Specification: TEST-01..TEST-30, UT-01..UT-04, E2E-01, E2E-02 | Issues #7, #9, #10, #11 |
| [dod.md](dod.md) | Product Definition of Done + per-feature checklists | Issues #7, #9, #10, #11 |

Product-level documents (SRS, feature inventory, traceability, system SDS, sprint plan) come from Issue #4 (merged in PR #14): `docs/srs.md`, `docs/features.md`, `docs/traceability.md`, `docs/system-sds.md`, `docs/sprints/plan.md`. This folder **does not edit them**; it details the Sprint 1 part of them. Where a contract is more specific than the system SDS, the difference is listed in section 4A and must be copied into the SDS/traceability only through a reviewed docs change.

## 2. Sprint 1 scope at a glance

| Feature | Requirements | AC | Tests | Depends on | Issue |
|---|---|---|---|---|---|
| F-01 Auth & RBAC | FR-01; NFR-01, NFR-02, NFR-07 | AC-01..AC-08 | TEST-01..TEST-08 (TEST-08 = E2E-01) | scaffold (#6) | #7 |
| F-02 Join queue & my ticket | FR-02, FR-03; BR-01, BR-02, BR-08, BR-09, BR-10; NFR-03 | AC-09..AC-18 | TEST-09..TEST-18 (TEST-18 in E2E-02), UT-02, UT-03 | F-01 | #9 |
| F-03 Operator service desk | FR-04, FR-05, FR-13; BR-03..BR-07; NFR-04 | AC-19..AC-30 | TEST-19..TEST-30 (TEST-30 in E2E-02), UT-01, UT-04 | F-01, F-02 | #10 |

TDD items (red test committed before the implementation): **AC-11 / TEST-11** (F-02) and **AC-26 / TEST-26 + UT-01** (F-03).

## 3. Shared conventions (all three features)

### 3.1 IDs
- `AC-NN` is verified by `TEST-NN` (one-to-one). AC-08, AC-18, AC-30 are UI criteria verified by Playwright tests titled `TEST-08`, `TEST-18`, `TEST-30`.
- Extra unit tests are `UT-NN` and support an AC (AC-15: UT-02, UT-03; AC-20: UT-04; AC-26: UT-01).
- Every test title starts with its ID: `it('TEST-11 / AC-11: rejects second active entry for same customer and queue', ...)`. Extra cases for the same AC reuse the ID: `it('TEST-01 / AC-01: rejects a non-JSON body with 415', ...)`. The Part F results table is generated from these titles.

### 3.2 API conventions
- Prefix `/api`. JSON only. All input is validated by DTOs (global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`).
- Queues are addressed by code (`/api/queues/D/...`). Entries and users are addressed by UUID.
- A path `:id` that is not a valid UUID returns **404 `NOT_FOUND`** (never 400 or 500), so IDs cannot be probed.
- State changes use POST only; GET never changes data.
- Identity and role come **only** from the session cookie. No endpoint reads a user id, role or lane from the body, query or headers.

### 3.3 Error shape (one global exception filter)

```json
{ "error": { "code": "DUPLICATE_ACTIVE_ENTRY", "message": "You already have an active ticket in this queue today." } }
```

The body has exactly one top-level key, `error`. No stack traces, SQL text, constraint names or internal messages are returned. Unknown errors return 500 `INTERNAL_ERROR` with a generic message.

| HTTP | Code | Meaning | Raised by |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | DTO validation failed (missing/extra/wrong-type field) | ValidationPipe |
| 401 | `INVALID_CREDENTIALS` | Login failed (wrong password **or** unknown user, same body) | F-01 |
| 401 | `UNAUTHENTICATED` | No cookie, unknown/garbage token, expired session | SessionAuthGuard |
| 403 | `FORBIDDEN` | Wrong role, or operator not assigned to the queue | RolesGuard, F-03 service |
| 403 | `NOT_ENTRY_OWNER` | Operator did not call this entry | F-03 service |
| 404 | `NOT_FOUND` | Unknown queue code, unknown/malformed entry id, or another customer's entry | F-02, F-03 |
| 409 | `QUEUE_CLOSED` | Join on a queue with `is_open = false` | F-02 |
| 409 | `DUPLICATE_ACTIVE_ENTRY` | Customer already holds an active entry in this queue today | F-02 |
| 409 | `NO_WAITING_ENTRY` | Call-next with nothing WAITING today | F-03 |
| 409 | `OPERATOR_BUSY` | Operator already holds a CALLED/SERVING entry today | F-03 |
| 409 | `INVALID_TRANSITION` | Transition not allowed by the state machine | F-03 |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | JSON-body endpoint called with another `Content-Type` | F-01 (login) |
| 500 | `INTERNAL_ERROR` | Anything unexpected (generic message only) | filter |

### 3.4 Shared response shapes

**User** (login, `/me`):
```json
{ "id": "uuid", "username": "customer1", "displayName": "Somchai (Senior)", "role": "CUSTOMER" }
```

**Entry** (join, `/me/entries`, `/entries/:id`, call-next, start, complete, current-entry):
```json
{
  "id": "uuid",
  "queueCode": "D",
  "displayNumber": "D001",
  "status": "WAITING",
  "lane": "REGULAR",
  "peopleAhead": 0,
  "joinedAt": "2026-11-06T02:00:00.000Z",
  "calledAt": null,
  "startedAt": null,
  "endedAt": null
}
```
- Timestamps are ISO-8601 UTC strings or `null`.
- `peopleAhead` = number of WAITING entries in the same queue and `queue_date` with a lower `seq`. It is a number only when `status = WAITING`; otherwise `null` (the key is always present, so clients never test for a missing key). Definition from SRS assumption A-06.
- The entry response never contains `customerId`, customer name, `operatorId` or any financial/ID field (BR-08, D-11).

**Queue summary** (`/queues`, `/operator/queues`):
```json
{ "code": "D", "name": "Deposit & Withdrawal", "isOpen": true, "waitingCount": 3 }
```
`waitingCount` = WAITING entries of that queue for **today's** Bangkok `queue_date`. Lists are ordered by `code`.

### 3.5 Time
- Every "now" comes from the injected clock (`CLOCK_TOKEN`, interface `IClock` in `apps/api/src/common/clock.ts`): `now()` for timestamps, `today()` for the Asia/Bangkok `queue_date` (`YYYY-MM-DD`). Tests use `ManualClock`.
- Domain and application code never calls `new Date()` (D-20). DB `DEFAULT now()` is a safety net only.

### 3.6 Seeded demo data (from `npm run db:seed`, scaffold #6)

| Username | Role | Assigned queue | Date of birth |
|---|---|---|---|
| teller1, teller2 | OPERATOR | D | - |
| loanofficer1 | OPERATOR | L | - |
| accountofficer1 | OPERATOR | O | - |
| customer1 | CUSTOMER | - | 1948-03-15 |
| customer2 | CUSTOMER | - | 1995-07-02 |
| customer3 | CUSTOMER | - | 2001-12-20 |
| customer4 | CUSTOMER | - | 1950-09-09 |

Queues: D "Deposit & Withdrawal", L "Loans", O "Account Opening", all open. All passwords = `SEED_DEMO_PASSWORD` (never committed). API/integration tests create their own fixtures with `createTestUser()` and do not rely on the demo seed; Playwright tests use the demo seed.

### 3.7 Test file layout (planned)

| Level | Location | Files |
|---|---|---|
| Unit (no DB) | `apps/api/test/unit/` | `entry-status.spec.ts` (UT-01), `display-number.spec.ts` (UT-02), `queue-date.spec.ts` (UT-03), `fifo-ordering-policy.spec.ts` (UT-04) |
| API + DB integration | `apps/api/test/integration/` | `f01-auth.spec.ts` (TEST-01..07), `f02-join-queue.spec.ts` (TEST-09..17), `f03-service-desk.spec.ts` (TEST-19..29) |
| E2E | `apps/web/e2e/` | `auth.spec.ts` (E2E-01 = TEST-08), `sprint1-journey.spec.ts` (E2E-02 = TEST-18, TEST-30) |

All files match the Jest `testRegex` `.*\.spec\.ts$` already configured in `apps/api/jest.config.ts`.

## 4. Scaffold alignment (must be fixed by the first feature PR that touches it)

The scaffold merged in PR #12 (Issue #6) differs from this contract in the points below. The contract is the reference; the listed Issue fixes the code in its own PR, with a test proving the fix. None of these changes the database schema.

| # | Scaffold today | Contract | Fixed in |
|---|---|---|---|
| SA-1 | `GlobalHttpExceptionFilter` returns `{ statusCode, error: "<CODE>", message, timestamp }` | `{ error: { code, message } }` only (3.3). AC-06 checks that the body has only `error`. | #7 (F-01) |
| SA-2 | `UnauthorizedError` code `UNAUTHORIZED` | `UNAUTHENTICATED` | #7 |
| SA-3 | `ForbiddenRoleError` code `FORBIDDEN_ROLE`; `QueueNotAssignedError` code `QUEUE_NOT_ASSIGNED` | both return `FORBIDDEN` (AC-17, AC-23, AC-28) | #7 (role), #10 (assignment) |
| SA-4 | No `InvalidCredentialsError`, no `VALIDATION_FAILED` / `UNSUPPORTED_MEDIA_TYPE` mapping | add them (3.3); ValidationPipe errors map to 400 `VALIDATION_FAILED` | #7 |
| SA-5 | Non-domain `Error` messages are returned to the client | 500 `INTERNAL_ERROR` with a generic message; log the detail server-side | #7 |
| SA-6 | Filter builds `timestamp` with `new Date()` | remove the field (not part of the error shape) | #7 |
| SA-7 | Web app is Next.js 15 (`next@^15.1.0`) | The route guard file is `src/middleware.ts` on Next 15 (`proxy.ts` is the Next 16 name), as system SDS 4.2 already states. | #7 |
| SA-8 | No `pg-errors.ts` mapping yet | map Postgres `23505` by constraint name: `uq_active_entry_per_customer` -> `DUPLICATE_ACTIVE_ENTRY`, `uq_operator_active_entry` -> `OPERATOR_BUSY` | #9 (entry), #10 (operator) |
| SA-9 | Playwright not installed; no Route Handler proxy / `lib/api.ts` / `lib/errors.ts` in `apps/web` yet | add them before the first E2E test | #7 |
| SA-10 | `PasswordHasher` is a static class (low cost when `NODE_ENV=test`); system SDS 1.5 says "injectable" | acceptable for Sprint 1 because the test cost is switched by `NODE_ENV`; TEST-07 still asserts the `$argon2id$` prefix. Make it an injectable provider only if a test needs to replace it. | no change required |

## 4A. Alignment with the merged baseline (PR #14)

These contracts follow `docs/system-sds.md`, `docs/srs.md` and `docs/traceability.md` as merged. The points below are **more specific** than the baseline; they do not contradict it. If the reviewer agrees, the baseline owner may copy them into the SDS later through a reviewed docs PR (and record them in traceability 5.2 "Approved changes" if they change scope).

| # | Baseline says | Contract detail | Where |
|---|---|---|---|
| BA-1 | SDS 3.1: current-entry returns "held entry or `null`" | Response is `{ "entry": <Entry> }` or `{ "entry": null }`. A bare `null` from a Nest controller is sent as an **empty body**, which the web client cannot parse reliably. | F-03 C-1 |
| BA-2 | SDS 3: 415 for non-JSON bodies, no code name; no 500 code | Code names `UNSUPPORTED_MEDIA_TYPE` (415) and `INTERNAL_ERROR` (500, generic message) | 3.3 |
| BA-3 | SDS 3: entries by UUID | A malformed UUID in a path returns 404 `NOT_FOUND` (never 400/500), same as an unknown id | 3.2 |
| BA-4 | SDS 2.4: start/complete checks ownership before the transition | A WAITING entry has no owner yet, so start/complete on it returns 409 `INVALID_TRANSITION` | F-03 C-2 |
| BA-5 | Traceability 5.1: BR-08 and NFR-07 have no executable AC; verified by manual check recorded in the DoD | Kept as manual checks in [dod.md](dod.md) section 1A. TEST-10 also asserts the entry response keys as a **supporting** check; this adds no new AC. | dod.md, sts.md |
| BA-6 | SRS A-09: `/me/entries` returns today's entries only; A-08: earlier-day entries never block | Same; covered by TEST-15 and TEST-16 (extra case) | F-02 |

## 5. Contract change procedure

Contracts may change, but every change stays visible and justified:

1. Edit the contract in the feature PR (or a separate `docs/...` PR) and bump the header to `Contract v2 - <date>`.
2. Add a row to the contract's **Version history** with the reason and the Issue/PR number.
3. Commit with `docs(F-0X): contract v2 - <reason> [AC-..]`.
4. If an AC or test changes, update `sts.md` in the same commit and tell the reviewer.
5. Never rewrite or squash the commit that introduced v1.

## 6. Version history

| Version | Date | Author | Change |
|---|---|---|---|
| v1 | 2026-11-06 | WATHITx | Initial Sprint 1 contract set (Issue #5). |
