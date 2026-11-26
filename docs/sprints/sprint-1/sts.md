# Sprint 1 Software Test Specification (STS)

**STS v2 - 2026-11-26** - Issue #5; v2 = Lab 7 CR-01 (TEST-12, TEST-15, TEST-18 revised; see section 5)
**Covers:** AC-01..AC-30 via TEST-01..TEST-30, UT-01..UT-04, E2E-01 (= TEST-08), E2E-02 (= TEST-18, TEST-30)
**Contracts:** [F-01-auth.md](F-01-auth.md), [F-02-join-queue.md](F-02-join-queue.md), [F-03-service-desk.md](F-03-service-desk.md)

## 1. Strategy

| Level | Tool | Database | Covers |
|---|---|---|---|
| Unit | Jest | none | UT-01..UT-04 (pure domain logic) |
| API + DB integration | Jest + Supertest + `@nestjs/testing` | real Postgres test DB (`queue_system_test`) | TEST-01..TEST-07, TEST-09..TEST-17, TEST-19..TEST-29 |
| E2E (UI) | Playwright | dev DB with demo seed | TEST-08 (E2E-01), TEST-18 + TEST-30 (E2E-02) |

**Every Sprint 1 AC is verified by at least one automated test. No AC relies only on a manual check.** Manual checks (screenshots for Part F) only supplement them.

### 1.1 Common rules
- Test titles start with the ID: `it('TEST-11 / AC-11: ...')`, `it('UT-01: ...')`. Extra cases for the same AC reuse the ID. Part F's AC -> TEST -> file -> result table is generated from these titles.
- Integration tests build the real Nest app (`AppModule`, global prefix `api`, `cookie-parser`, global `ValidationPipe`, global filter) and override `CLOCK_TOKEN` with a `ManualClock`.
- Before each test file: `clearDatabase()` (truncate all tables except `typeorm_migrations`). Fixtures are created per test with `createTestUser()` and direct SQL for queues/assignments. Tests never depend on the demo seed.
- Default fixture (written `FX` below): queues D, L, O (open); operators `teller1`, `teller2` -> D, `loanofficer1` -> L; customers `c1`, `c2` (DOB 1990-01-01); password `test_password_123`. Clock = `2026-11-06T03:00:00Z` (10:00 Bangkok, `today() = 2026-11-06`).
- `login(user)` helper = `POST /api/auth/login` and keep the `sid` cookie.
- Integration tests run with `--runInBand`. Concurrency tests use `Promise.all` of real HTTP requests against one app instance.
- "Row unchanged" means the full DB row (status, operator_id, all timestamps) equals the snapshot taken before the call.
- Never skip, weaken or delete a test to get green. Failures are reported as they are.

### 1.2 Commands
| Purpose | Command |
|---|---|
| All API tests | `npm test` |
| One test by ID | `npm test -- -t "TEST-11"` |
| E2E | `npm run test:e2e` (added in #7 with Playwright, SA-9) |
| Evidence JSON | `npx jest --ci --json --outputFile=docs/sprints/sprint-1/evidence/results.json` (Issue #11) |

### 1.3 TDD plan
| Rule | Test(s) | Red evidence | Green evidence | Issue |
|---|---|---|---|---|
| BR-02 duplicate active entry (AC-11) | TEST-11 | `docs/sprints/sprint-1/evidence/TEST-11-red.txt` | `TEST-11-green.txt` | #9 |
| BR-04 invalid transitions (AC-26) | TEST-26 + UT-01 | `docs/sprints/sprint-1/evidence/TEST-26-red.txt` | `TEST-26-green.txt` | #10 |

Sequence for each: commit the failing test (`test(F-0X): ... failing`) -> run `npm test -- -t "<ID>"` and save the output -> commit the output -> commit the implementation (`feat(F-0X): ...`) -> save and commit the green output. Merge the feature PR with a **merge commit** so the order stays visible.

## 2. Test cases

### 2.1 F-01 Auth & RBAC - `apps/api/test/integration/f01-auth.spec.ts`

| ID | AC | Level | Preconditions / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-01 | AC-01 | API | FX; `c1` exists | `POST /api/auth/login` `{username:'c1', password:'test_password_123'}` | 200; body exactly `{id, username:'c1', displayName, role:'CUSTOMER'}` (no `passwordHash`/`password_hash`/token); `Set-Cookie` has `sid=`, `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=28800`; one `sessions` row whose `token_hash` = sha256(cookie value) and `expires_at` = clock + 8 h |
| TEST-01 (extra) | AC-01 | API | FX | same login with `Content-Type: application/x-www-form-urlencoded` | 415 `UNSUPPORTED_MEDIA_TYPE`; no session row |
| TEST-02 | AC-02 | API | FX | (a) `c1` with wrong password; (b) unknown username `nobody` | both 401; both bodies identical `{error:{code:'INVALID_CREDENTIALS', message}}`; no `Set-Cookie`; `sessions` empty |
| TEST-02 (extra) | AC-02 | API | FX | (a) `{username:'c1'}` (no password); (b) `{username:'c1', password:'x', role:'OPERATOR'}` | 400 `VALIDATION_FAILED`; no session row |
| TEST-03 | AC-03 | API | FX; `c1` logged in | `GET /api/auth/me` with (a) valid cookie, (b) no cookie, (c) `sid=garbage` | (a) 200 `{id, username:'c1', displayName, role:'CUSTOMER'}`; (b), (c) 401 `UNAUTHENTICATED`, body only `{error}` |
| TEST-04 | AC-04 | API | FX; `c1` logged in | `POST /api/auth/logout`, then `GET /api/auth/me` with the old cookie | logout 204 + `Set-Cookie` clearing `sid`; the session row is gone; `/me` -> 401 `UNAUTHENTICATED` |
| TEST-05 | AC-05 | API | FX; `c1` logged in at clock T | advance `ManualClock` by 8 h + 1 min; `GET /api/auth/me` | 401 `UNAUTHENTICATED`; the session row is deleted |
| TEST-05 (extra) | AC-05 | API | same, advance by 7 h 59 min | `GET /api/auth/me` | 200 (session still valid just before expiry) |
| TEST-06 | AC-06 | API | FX; no cookie | table-driven: every endpoint in F-01 contract 4.4 (11 endpoints; `:id` = random UUID) | each returns 401; body has exactly one key `error` with `code:'UNAUTHENTICATED'`; no other data. F-01 adds 2 rows, F-02 adds 4, F-03 adds 5 |
| TEST-07 | AC-07 | Integration | user created through `PasswordHasher` with password `p` | read `users.password_hash` | starts with `$argon2id$`; `!== p`; `PasswordHasher.verify(hash, p)` is true |

### 2.2 F-02 Join queue & my ticket - `apps/api/test/integration/f02-join-queue.spec.ts`

| ID | AC | Level | Preconditions / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-09 | AC-09 | API | FX; O closed; 2 WAITING entries in D today, 1 WAITING in D yesterday | `GET /api/queues` as `c1`, then as `teller1` | 200 for both; `[{code:'D', name, isOpen:true, waitingCount:2}, {code:'L', ..., waitingCount:0}, {code:'O', ..., isOpen:false, waitingCount:0}]` ordered by code |
| TEST-10 | AC-10 | API | FX; D empty today | `POST /api/queues/D/entries` as `c1` | 201 `{id, queueCode:'D', displayNumber:'D001', status:'WAITING', lane:'REGULAR', peopleAhead:0, joinedAt:<clock>, calledAt:null, startedAt:null, endedAt:null}`; response has no customer id/name; DB row exists with `customer_id = c1`, `seq = 1`, `queue_date = '2026-11-06'`, `joined_at = clock` |
| TEST-10 (extra) | AC-10 | API | FX | join as `c1` with body `{lane:'PRIORITY', customerId:<c2 id>}` | 201; `lane:'REGULAR'`; the row's `customer_id = c1` |
| TEST-11 ★TDD | AC-11 | API | FX; `c1` has a WAITING entry in D today | `POST /api/queues/D/entries` as `c1` again | 409 `DUPLICATE_ACTIVE_ENTRY`; exactly 1 active row for (`c1`, D, today); `queue_daily_counter.last_seq` still 1 |
| ~~TEST-12 v1~~ | ~~AC-12 v1~~ | API | FX | `c1` joins D, then L | ~~both 201 (`D001`, `L001`); 2 active rows for `c1`~~ (replaced in v2) |
| TEST-12 v2 | AC-12 v2 | API | FX | `c1` joins D, then L | D 201 `D001`; L 409 `DUPLICATE_ACTIVE_ENTRY`; 1 active row for `c1`; no `queue_daily_counter` row for L today |
| TEST-12 v2 (boundary) | AC-12 v2 | API | FX; `c1`'s D entry set to CALLED, then to SERVING (by `teller1`) | `c1` joins L each time | 409 `DUPLICATE_ACTIVE_ENTRY` both times; no L row |
| TEST-12 v2 (boundary) | AC-12 v2 | API | FX; `c1`'s D entry set to COMPLETED | `c1` joins L | 201 `L001` |
| TEST-12 v2 (boundary) | AC-12 v2 / D-13 | API | FX; `c1` has a WAITING D entry dated yesterday | `c1` joins L | 201 `L001` |
| TEST-12 v2 (race) | AC-12 v2 | API | FX | `c1` joins D and L with `Promise.all` | statuses sorted = [201, 409]; exactly 1 active row for `c1` |
| TEST-12 (extra) | AC-12 / BR-02 scope | API | FX; `c1`'s D entry set to COMPLETED in the DB | `c1` joins D again | 201 `D002` |
| TEST-13 | AC-13 | API | FX; D set `is_open = false` | `c1` joins D | 409 `QUEUE_CLOSED`; no `queue_entries` row; no `queue_daily_counter` row for D today |
| TEST-13 (extra) | AC-13 | API | FX | `c1` joins `Z` and `d` | 404 `NOT_FOUND` for both |
| TEST-14 | AC-14 | API | FX + 20 extra customers (one pre-computed hash), each logged in | 20 joins to D with `Promise.all` | 20 × 201; DB has 20 rows for D today with `seq` = {1..20} exactly; 20 distinct `display_number`s; `last_seq = 20` |
| TEST-15 | AC-15, D-13 | API (fixed Clock) | FX | clock `2026-11-06T16:59:00Z` (23:59 BKK): `c1` joins D, `c2` joins D, `c1` joins L; then clock `2026-11-06T17:00:00Z` (00:00 BKK next day): `c2` joins D (its 2026-11-06 entry is still WAITING) | `D001`, `D002`, `L001` with `queue_date = 2026-11-06`; after midnight `c2` gets 201 `D001` with `queue_date = 2026-11-07` (restart at 001, and yesterday's active entry does not block) |
| TEST-16 | AC-16 | API | FX; `c1` joined D (`D001`), `c2` joined D (`D002`) | `GET /api/entries/<c2 entry>` as `c2`; as `c1`; as `teller1` | `c2`: 200 with `peopleAhead: 1`; `c1`: 404 `NOT_FOUND` (body has no entry data); `teller1`: 403 `FORBIDDEN` |
| TEST-16 (extra) | AC-16 | API | FX | `GET /api/entries/not-a-uuid` and `GET /api/me/entries` as `c1` | 404 `NOT_FOUND`; `/me/entries` returns only `c1`'s today entries |
| TEST-17 | AC-17 | API | FX | `POST /api/queues/D/entries` as `teller1`; `GET /api/me/entries` as `teller1` | 403 `FORBIDDEN` for both; no row inserted |

### 2.3 F-03 Operator service desk - `apps/api/test/integration/f03-service-desk.spec.ts`

| ID | AC | Level | Preconditions / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-19 | AC-19 | API | FX; 2 WAITING in D, 1 WAITING in L | `GET /api/operator/queues` and `GET /api/operator/current-entry` as `teller1`; call-next; `current-entry` again | queues = only `[{code:'D', ..., waitingCount:2}]`; first `current-entry` = `{entry:null}`; after call-next `{entry:{..., status:'CALLED'}}` |
| TEST-20 | AC-20 | API | FX; `c1` (`D001`), `c2` (`D002`) WAITING | `POST /api/queues/D/call-next` as `teller1` | 200 entry `D001`, `status:'CALLED'`, `calledAt = clock`; DB row `operator_id = teller1`; `D002` still WAITING |
| TEST-21 | AC-21 | API | FX; no WAITING entry in D today (one WAITING yesterday) | call-next on D as `teller1` | 409 `NO_WAITING_ENTRY`; no row changed |
| TEST-22 | AC-22 | API | FX; `teller1` holds a CALLED entry; another entry WAITING | call-next again; then start it (SERVING) and call-next again | both 409 `OPERATOR_BUSY`; the WAITING entry is unchanged |
| TEST-23 | AC-23 | API | FX; 1 WAITING in L | call-next on L as `teller1` | 403 `FORBIDDEN`; the L entry stays WAITING |
| TEST-23 (extra) | AC-23 | API | FX | call-next on `Z` as `teller1`; `loanofficer1` starts a D entry called by `teller1` | 404 `NOT_FOUND`; 403 `FORBIDDEN` |
| TEST-24 | AC-24 | API | FX; (a) 2 WAITING in D; (b) 1 WAITING in D | `teller1` and `teller2` call-next on D with `Promise.all` | (a) both 200 with different entry ids; (b) one 200, the other 409 `NO_WAITING_ENTRY`; never the same entry twice. Repeat 5 times in a loop to detect flakiness |
| TEST-25 | AC-25 | API | FX; `teller1` called `c1`'s entry | start (clock T1), complete (clock T2); `c1` reads the entry after each step | start 200 `SERVING`, `startedAt = T1`; complete 200 `COMPLETED`, `endedAt = T2`; `c1` sees SERVING then COMPLETED |
| TEST-25 (extra) | AC-25 | API | after the entry is COMPLETED, another entry WAITING | `teller1` call-next | 200 (operator is free again) |
| TEST-26 ★TDD | AC-26 | API | FX; entries prepared by `teller1` in each state | (a) complete a CALLED entry; (b) start a SERVING entry (start twice); (c) start a COMPLETED entry; (d) start a WAITING entry | each 409 `INVALID_TRANSITION`; each row unchanged |
| TEST-26 (extra) | AC-26 | API | FX | start / complete `not-a-uuid` and a random UUID | 404 `NOT_FOUND` |
| TEST-27 | AC-27 | API | FX; `teller1` called an entry | `teller2` starts it; `teller1` starts it; `teller2` completes it | 403 `NOT_ENTRY_OWNER` (row unchanged); 200; 403 `NOT_ENTRY_OWNER` (row still SERVING) |
| TEST-28 | AC-28 | API | FX; `c1` has a WAITING entry | as `c1`: call-next D, start and complete own entry, `GET /api/operator/queues`, `GET /api/operator/current-entry` | all 403 `FORBIDDEN`; entry unchanged |
| TEST-29 | AC-29 / NFR-04 | Integration | FX; entry taken to COMPLETED | `app.close()`; build a new Nest app on the same test DB; log in as `c1`; `GET /api/entries/:id` | 200 `status:'COMPLETED'` with the same timestamps |

### 2.4 Unit tests - `apps/api/test/unit/`

| ID | AC | File | Input | Expected result |
|---|---|---|---|---|
| UT-01 | AC-26 | `entry-status.spec.ts` | every (status × action) pair: 7 statuses × {call, start, complete} | only WAITING+call -> CALLED, CALLED+start -> SERVING, SERVING+complete -> COMPLETED are allowed; the other 18 pairs throw `InvalidTransitionError` |
| UT-02 | AC-15 | `display-number.spec.ts` | (`D`,1), (`D`,10), (`L`,999), (`D`,1000) | `D001`, `D010`, `L999`, `D1000` |
| UT-03 | AC-15 | `queue-date.spec.ts` | `ManualClock` at `2026-11-06T16:59:59Z` and `2026-11-06T17:00:00Z` | `today()` = `2026-11-06` then `2026-11-07` |
| UT-04 | AC-20 | `fifo-ordering-policy.spec.ts` | `waiting` = {REGULAR:true, PRIORITY:false}, {false,true}, {false,false}; any `recentCalledLanes` | `'ANY'`, `'ANY'`, `null` |

### 2.5 E2E (Playwright) - `apps/web/e2e/`

Preconditions for all E2E: `npm run db:up && npm run db:migrate && npm run db:reset && npm run db:seed`; API on 3001, web on 3000; `SEED_DEMO_PASSWORD` set in the test environment; queues D, L, O empty and open.

| ID | AC | File | Steps | Expected result |
|---|---|---|---|---|
| TEST-08 (E2E-01) | AC-08 | `auth.spec.ts` | 1. visit `/queues` anonymously; 2. visit `/operator`; 3. log in as `customer1`; 4. Logout; 5. log in as `teller1`; 6. Logout | 1-2 redirect to `/login`; 3 lands on `/queues` with "customer1"'s display name in the header; 4 returns to `/login`; 5 lands on `/operator`; 6 returns to `/login` |
| TEST-18 (E2E-02) | AC-18 | `sprint1-journey.spec.ts` | 1. `customer1` logs in, joins D on `/queues`; 2. check `/my-ticket`; 3. go back to `/queues`, join D again | 1-2 `/my-ticket` shows `D001`, "Waiting", "People ahead: 0"; 3 shows the duplicate message "You already have an active ticket in this queue today." |
| TEST-30 (E2E-02) | AC-30, AC-25 (UI) | `sprint1-journey.spec.ts` (continues TEST-18 in a second browser context) | 1. `teller1` logs in, sees D with "1 waiting"; 2. Call next; 3. reload the page; 4. Start; 5. Complete; 6. `customer1`'s `/my-ticket` | 1 assigned queue visible; 2 card shows `D001` CALLED with **Start**; 3 the same entry is restored after reload; 4 shows **Complete**; 5 card empties; 6 shows "Completed" within one 5-second poll |

## 3. Traceability: AC -> test

| AC | Planned test | Supporting tests | Level | File |
|---|---|---|---|---|
| AC-01 | TEST-01 | - | API | `f01-auth.spec.ts` |
| AC-02 | TEST-02 | - | API | `f01-auth.spec.ts` |
| AC-03 | TEST-03 | - | API | `f01-auth.spec.ts` |
| AC-04 | TEST-04 | - | API | `f01-auth.spec.ts` |
| AC-05 | TEST-05 | - | API | `f01-auth.spec.ts` |
| AC-06 | TEST-06 | - | API | `f01-auth.spec.ts` |
| AC-07 | TEST-07 | - | Integration | `f01-auth.spec.ts` |
| AC-08 | TEST-08 | E2E-01 | E2E | `e2e/auth.spec.ts` |
| AC-09 | TEST-09 | - | API | `f02-join-queue.spec.ts` |
| AC-10 | TEST-10 | - | API | `f02-join-queue.spec.ts` |
| AC-11 ★ | TEST-11 | - | API (TDD) | `f02-join-queue.spec.ts` |
| AC-12 | TEST-12 | - | API | `f02-join-queue.spec.ts` |
| AC-13 | TEST-13 | - | API | `f02-join-queue.spec.ts` |
| AC-14 | TEST-14 | - | API (concurrency) | `f02-join-queue.spec.ts` |
| AC-15 | TEST-15 | UT-02, UT-03 | API + unit | `f02-join-queue.spec.ts`, `unit/display-number.spec.ts`, `unit/queue-date.spec.ts` |
| AC-16 | TEST-16 | - | API | `f02-join-queue.spec.ts` |
| AC-17 | TEST-17 | - | API | `f02-join-queue.spec.ts` |
| AC-18 | TEST-18 | E2E-02 | E2E | `e2e/sprint1-journey.spec.ts` |
| AC-19 | TEST-19 | - | API | `f03-service-desk.spec.ts` |
| AC-20 | TEST-20 | UT-04 | API + unit | `f03-service-desk.spec.ts`, `unit/fifo-ordering-policy.spec.ts` |
| AC-21 | TEST-21 | - | API | `f03-service-desk.spec.ts` |
| AC-22 | TEST-22 | - | API | `f03-service-desk.spec.ts` |
| AC-23 | TEST-23 | - | API | `f03-service-desk.spec.ts` |
| AC-24 | TEST-24 | - | API (concurrency) | `f03-service-desk.spec.ts` |
| AC-25 | TEST-25 | E2E-02 (UI part) | API | `f03-service-desk.spec.ts` |
| AC-26 ★ | TEST-26 | UT-01 | API + unit (TDD) | `f03-service-desk.spec.ts`, `unit/entry-status.spec.ts` |
| AC-27 | TEST-27 | - | API | `f03-service-desk.spec.ts` |
| AC-28 | TEST-28 | - | API | `f03-service-desk.spec.ts` |
| AC-29 | TEST-29 | - | Integration | `f03-service-desk.spec.ts` |
| AC-30 | TEST-30 | E2E-02 | E2E | `e2e/sprint1-journey.spec.ts` |

Coverage summary: 30 AC, 30 planned tests (27 Jest API/integration, 3 Playwright), 4 unit tests, 2 E2E specs. Requirement coverage: FR-01..FR-05, FR-13; BR-01..BR-10; NFR-01..NFR-04. BR-08 and NFR-07 have no executable AC (traceability 5.1) and are **manual checks** in [dod.md](dod.md) section 1A; TEST-10's response-key assertion supports BR-08 but is not counted as its verification.

Negative / boundary / role cases required by the review checklist: AC-02, AC-06, AC-11, AC-13, AC-16, AC-17, AC-21, AC-22, AC-23, AC-24, AC-26, AC-27, AC-28 - all present above.

## 4. Part F demonstration set (manual, supplements the automated tests)

| # | Scenario | AC | Role | Evidence |
|---|---|---|---|---|
| 1 | Normal journey: E2E-02 steps in the UI, then `GET /api/me/entries` shows the persisted COMPLETED entry | AC-18, AC-25, AC-30 | customer1, teller1 | screenshots + JSON response |
| 2 | Rule rejection: duplicate join in the UI + the 409 API response | AC-11 | customer1 | screenshot + response |
| 3 | Access: login/logout; teller1 call-next on L -> 403; customer1 reads customer2's entry -> 404 | AC-01, AC-04, AC-23, AC-16 | customer1, teller1 | screenshots + responses |

## 5. Version history

| Version | Date | Author | Change |
|---|---|---|---|
| v1 | 2026-11-06 | WATHITx | Initial STS (Issue #5) |
| v2 | 2026-11-26 | WATHITx | Lab 7 CR-01: TEST-12 replaced by TEST-12 v2 (+ boundary and race cases). TEST-15 setup: the L join is made by a new customer `c3` instead of `c1` (assertions unchanged). TEST-18: duplicate message text updated. |
