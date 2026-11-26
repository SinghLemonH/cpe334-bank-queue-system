# Sprint 2 Software Test Specification (STS)

**STS v1 - 2026-11-27** - plan Issue S2-1
**Covers:** AC-31..AC-54 via TEST-31..TEST-54, UT-05, UT-06, E2E-03 (= TEST-36), E2E-04 (= TEST-49); manual checks TEST-41 and TEST-54
**Contracts:** [README.md](README.md) sections 3 and 4

## 1. Strategy

| Level | Tool | Database | Covers |
|---|---|---|---|
| Unit | Jest | none | UT-05 (no-show rule), UT-06 (transition table v2) |
| API + DB integration | Jest + Supertest + `@nestjs/testing` | real Postgres test DB | TEST-31..TEST-35, TEST-37..TEST-40, TEST-42..TEST-48, TEST-50..TEST-53 |
| E2E (UI) | Playwright | dev DB with demo seed | TEST-36 (E2E-03), TEST-49 (E2E-04) |
| Manual (screenshot) | browser on the deployed `v0.4.0-sprint2` | production DB | TEST-41, TEST-54 |

Two UI criteria are manual and are labelled as such in every report: **TEST-41** (the no-show button needs a real 2-minute wait, which is impractical in E2E; the rule itself is covered by TEST-37, TEST-38 and UT-05) and **TEST-54** (open/close and end-of-day screens; the rules are covered by TEST-50..TEST-53). Manual results go to `docs/sprints/sprint-2/evidence/manual-checks.md` with the screenshot, date and deployed SHA.

### 1.1 Common rules (same as Sprint 1 STS 1.1, plus)
- Test titles start with the ID: `it('TEST-38 / AC-38: rejects no-show 1 second before the grace period', ...)`.
- Fixture `FX` from Sprint 1 (queues D, L, O; `teller1`, `teller2` → D; `loanofficer1` → L; customers `c1`, `c2`; Clock `2026-11-06T03:00:00Z`) plus **`FX2`**: counters `K1` "Counter 1" and `K2` "Counter 2" on D, `KL` "Counter 3" on L (direct SQL), and customer `c3`.
- Time-dependent tests (grace period, yesterday's entries) use `ManualClock.setTime` / `advanceMinutes` / `advanceDays`; never real waiting.
- "Row unchanged" = the full DB row (status, operator_id, counter_id, all timestamps) equals the snapshot taken before the call.
- E2E tests share the seeded dev DB with `workers: 1`. Each E2E uses a customer that no other spec uses, and ends with no active ticket for that customer and no held entry for its operator (BR-02 v2 allows one active ticket per customer per day).
- Never skip, weaken or delete a test to get green.

### 1.2 Commands
| Purpose | Command |
|---|---|
| All API tests | `npm test` |
| One test by ID | `npm test -- -t "TEST-38"` |
| E2E | `npm run test:e2e` |
| Migration check (S2-2) | `npm run db:reset && npm run db:migrate`; then with data: `npm run db:seed`, create entries, `npm run db:migrate`; then `npm run --workspace=apps/api migration:revert` and `npm run db:migrate` |

### 1.3 TDD plan
| Rule | Test(s) | Red evidence | Green evidence | Issue |
|---|---|---|---|---|
| BR-12 no-show grace boundary (AC-38) | TEST-38 + UT-05 | `docs/sprints/sprint-2/evidence/TEST-38-red.txt` | `TEST-38-green.txt` | S2-3 |
| BR-13 one active entry per counter (AC-43) | TEST-43 | `docs/sprints/sprint-2/evidence/TEST-43-red.txt` | `TEST-43-green.txt` | S2-2 |

Sequence for each: commit the failing test (`test(F-0X): ... failing`) → run `npm test -- -t "<ID>"` and save the output → commit the implementation (`feat(F-0X): ...`) → save and commit the green output. Merge with a **merge commit** so the order stays visible.

## 2. Test cases

### 2.1 F-04 Customer cancel - `apps/api/test/integration/f04-cancel.spec.ts`

| Test | AC | Setup / input | Expected |
|---|---|---|---|
| TEST-31 | AC-31 | FX; c1 joins D, c2 joins D; c1 `POST /api/entries/{c1}/cancel` | 200, `status` CANCELLED, `endedAt` = Clock now; `GET /api/entries/{c1}` → CANCELLED; c2's `peopleAhead` 1 → 0 |
| TEST-32 | AC-32 | FX; c1 and c2 join D; teller1 calls next (c1 CALLED); c1 cancels | 200 CANCELLED; teller1 `GET /api/operator/current-entry` → `{ entry: null }`; teller1 call-next → 200 (c2), not `OPERATOR_BUSY` |
| TEST-33 | AC-33 | Entries in SERVING, COMPLETED and CANCELLED; owner cancels each | 409 `INVALID_TRANSITION` each; rows unchanged |
| TEST-34 | AC-34 | c1's WAITING entry; c2 cancels it; teller1 cancels it; extra: malformed id | c2 → 404 `NOT_FOUND`, row unchanged; teller1 → 403 `FORBIDDEN`; malformed → 404. 401 is covered by the TEST-06 row |
| TEST-35 | AC-35 | c1 joins D (D001), cancels, joins D again | 201, new `displayNumber` D002, WAITING |

### 2.2 F-05 No-show - `apps/api/test/integration/f05-no-show.spec.ts`, `apps/api/test/unit/no-show-rule.spec.ts`

| Test | AC | Setup / input | Expected |
|---|---|---|---|
| TEST-37 | AC-37 | FX; c1 joins D; teller1 calls (Clock T); `advanceMinutes(2)`; teller1 `POST /api/entries/{id}/no-show` | 200 NO_SHOW, `endedAt` = T + 2 min; teller1 call-next on a new WAITING entry → 200 |
| TEST-38 ★ | AC-38 | Same, but Clock = T + 1 min 59 s | 409 `NO_SHOW_TOO_EARLY`; row still CALLED, unchanged |
| UT-05 | AC-38 | `isNoShowAllowed(calledAt, now, grace)` with now = +1:59, +2:00, +2:01 (grace 2) and +0 (grace 0) | false, true, true, true; `noShowAllowedAt` = calledAt + grace |
| TEST-39 | AC-39 | teller1's CALLED entry (past grace); no-show by teller2, loanofficer1, c1 | 403 `NOT_ENTRY_OWNER`; 403 `FORBIDDEN`; 403 `FORBIDDEN`; rows unchanged. 401 via TEST-06 row |
| TEST-40 | AC-40 | Entries WAITING, SERVING, COMPLETED; no-show by the operator (or, for WAITING, any assigned operator) | 409 `INVALID_TRANSITION` each; rows unchanged |

### 2.3 Transition table v2 - `apps/api/test/unit/entry-status.spec.ts` (extended)

| Test | AC | Input | Expected |
|---|---|---|---|
| UT-06 | AC-33, AC-40, AC-52 | Every status × action in `{call, start, complete, cancel, noShow, expire}` | Exactly the allowed pairs of README 3.1 succeed with the listed target; all others throw `InvalidTransitionError`. UT-01 (Sprint 1 pairs) unchanged and green |

### 2.4 F-07 Counters (+ F-03 v2) - `apps/api/test/integration/f07-counters.spec.ts`

| Test | AC | Setup / input | Expected |
|---|---|---|---|
| TEST-42 | AC-42 | FX + FX2; c1 joins D; teller1 call-next `{ counterId: K1 }` | 200 CALLED, `counterLabel` "Counter 1"; c1 `GET /api/entries/{id}` → same label; DB `counter_id = K1` |
| TEST-43 ★ | AC-43 | FX + FX2; 3 WAITING on D; teller1 calls with K1; teller2 calls with K1; teller1 starts; teller2 calls with K1; teller1 completes; teller2 calls with K1 | 409 `COUNTER_BUSY` twice (CALLED, then SERVING), no entry changed; last call 200 with "Counter 1" |
| TEST-44 | AC-44 | teller1 call-next on D with `KL`; with a random UUID; with `"abc"`; with `{ counterId: K1, extra: 1 }` | 404 `NOT_FOUND`; 404 `NOT_FOUND`; 400 `VALIDATION_FAILED`; 400 `VALIDATION_FAILED`; nothing CALLED |
| TEST-45 | AC-45 | teller1 call-next on D with no body | 200 CALLED, `counterLabel: null` |
| TEST-46 | AC-46 | `GET /api/queues/D/counters` as teller1, loanofficer1, c1 | 200 `[K1, K2]` (ids and labels, ordered by label, no L counters); 403; 403. 401 via TEST-06 row |

Supporting update: **TEST-10** (Sprint 1, `f02-join-queue.spec.ts`) adds `counterLabel` to its exact key set in the same commit as the entry-shape change (README 3.3).

### 2.5 F-06 Public board - `apps/api/test/integration/f06-board.spec.ts`

| Test | AC | Setup / input | Expected |
|---|---|---|---|
| TEST-47 | AC-47 | FX + FX2; today on D: 2 WAITING, 1 CALLED (K1), 1 SERVING (K2), 1 each COMPLETED/CANCELLED/NO_SHOW/EXPIRED; yesterday on D: 1 CALLED; `GET /api/public/board` without a cookie | 200; D `waitingCount` 2; `nowServing` = the CALLED and SERVING entries of today only, with "Counter 1"/"Counter 2", ordered by `called_at`; L and O listed with empty `nowServing` |
| TEST-48 | AC-48 | Same data | Top-level keys `{generatedAt, queues}`; queue keys `{code, name, isOpen, waitingCount, nowServing}`; item keys `{displayNumber, counterLabel, status, lane}`; raw body has no UUID match, no fixture username and no display name; header `Cache-Control: no-store` |

### 2.6 F-08 Open/close and end-of-day - `apps/api/test/integration/f08-open-close.spec.ts`

| Test | AC | Setup / input | Expected |
|---|---|---|---|
| TEST-50 | AC-50 | teller1 `PATCH /api/queues/D { isOpen: false }`; c1 joins D; `GET /api/queues`; teller1 PATCH `{ isOpen: true }`; c1 joins D | 200 `isOpen: false`; 409 `QUEUE_CLOSED`; D `isOpen: false`; 200; 201 |
| TEST-51 | AC-51 | c1 WAITING on D; close D; teller1 call-next, start, complete | 200 each; final COMPLETED |
| TEST-52 | AC-52 | Clock yesterday: c3 joins D (WAITING). Clock today: 2 WAITING, 1 CALLED (teller1), 1 SERVING (teller2), 1 COMPLETED on D; teller1 `POST /api/queues/D/end-day` | 200 `expiredCount: 3`, `queue.isOpen: false`; the 3 entries EXPIRED with `endedAt`; SERVING, COMPLETED and yesterday's entry unchanged; teller1 current-entry `{ entry: null }` |
| TEST-53 | AC-53 | loanofficer1 PATCH and end-day on D; c1 PATCH; PATCH bodies `{}`, `{ isOpen: "no" }`, `{ isOpen: true, x: 1 }`; PATCH `/api/queues/Z` | 403; 403; 400 ×3; 404. 401 via TEST-06 rows |

### 2.7 NFR-01 sweep - `apps/api/test/helpers/protected-endpoints.ts` (TEST-06, Sprint 1)

Five rows are appended: `POST /api/entries/:id/cancel` (F-04), `POST /api/entries/:id/no-show` (F-05), `GET /api/queues/D/counters` (F-07), `PATCH /api/queues/D` and `POST /api/queues/D/end-day` (F-08). The existing `POST /api/queues/D/call-next` row stays (it still needs a session). `ProtectedEndpoint.method` gains `'patch'` and the `feature` union is widened. The public board is **not** in the table; TEST-47 proves it works without a session.

### 2.8 E2E - `apps/web/e2e/`

| Test | AC | File | Steps | Expected |
|---|---|---|---|---|
| TEST-36 (E2E-03) | AC-36 | `sprint2-cancel.spec.ts` | Sign in as a seeded customer not used by other specs → join D → `/my-ticket` → Cancel ticket → accept the confirm dialog | The ticket card (`data-testid="ticket"`) shows "Cancelled" and the cancelled notice; Join is possible again on `/queues` |
| TEST-49 (E2E-04) | AC-49 | `sprint2-board.spec.ts` | Customer joins D; operator (teller2) selects Counter 2 and presses Call next; a new anonymous browser context opens `/board`; cleanup: operator starts and completes | Board shows the display number with "Counter 2" within 6 s; afterwards no active ticket or held entry remains |

### 2.9 Manual checks - `docs/sprints/sprint-2/evidence/manual-checks.md`

| Test | AC | Where | Steps | Pass condition |
|---|---|---|---|---|
| TEST-41 | AC-41 | deployed `v0.4.0-sprint2`, queue D | Customer joins; operator calls; screenshot of the card with No-show; wait 2 min; press No-show | Before: hint visible; after: card cleared, customer's ticket shows No-show |
| TEST-54 | AC-54 | deployed `v0.4.0-sprint2`, queue **L** (never O, see plan) | Close L → screenshot `/queues`; reopen; create 1 WAITING; End of day | Closed badge + disabled Join; "1 tickets expired." shown; L reopened at the end |

## 3. Regression

Every Sprint 2 PR runs the full suite (Sprint 1 TEST-01..TEST-30, UT-01..UT-04, E2E-01/02, Lab 6 `lab6-mobile-layout.spec.ts`, Lab 7 TEST-12 v2) in CI. Cross-feature checks that protect older behavior: TEST-32 (cancel × operator hold), TEST-35 (cancel × BR-02 v2), TEST-45 (call-next without counter = Sprint 1), TEST-51 (closed queue × service desk), TEST-52 (end-day × operator hold).

## 4. Version history

| Version | Date | Author | Change |
|---|---|---|---|
| v1 | 2026-11-27 | WATHITx | Initial Sprint 2 STS (plan Issue S2-1) |
