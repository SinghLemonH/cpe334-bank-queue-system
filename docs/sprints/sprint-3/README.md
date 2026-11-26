# Sprint 3 Engineering Contracts

**Status:** Contract set v1 - 2026-11-27 - plan Issue S2-1 (written together with the Sprint 2 contracts), branch `docs/sprint-2-3-contracts`
**Author:** WATHITx (Student B) - **Reviewer:** SinghLemonH (Student A)
**Sprint goal:** priority lane for senior customers, service summary, and hardening for the final release (F-09, F-10, F-11).
**Baseline:** Sprint 2 contracts in [`../sprint-2/README.md`](../sprint-2/README.md) (state machine v2, entry response v2, migration 002).

| Feature | Requirements | AC | Tests | Issue | Status at Deliverable 2 (29 Nov) |
|---|---|---|---|---|---|
| F-09 Priority lane | FR-10; BR-14, BR-15; D-12 | AC-55..AC-60 | TEST-55..TEST-60, UT-07, UT-08 | S3-1 (author A, reviewer B) | **Must be implemented and tested** |
| F-10 Service summary | FR-11 | AC-61..AC-65 | TEST-61..TEST-65 | after 29 Nov (author A) | Planned |
| F-11 Hardening | NFR-01, NFR-04, NFR-06; regression | AC-66..AC-70 | TEST-66..TEST-70 | after 29 Nov (author B) | Planned |

TDD item: **AC-57 / TEST-57 + UT-08** (priority before regular). F-09 starts only after the Sprint 2 release (`v0.4.0-sprint2`) so the Sprint 2 release stays identifiable without Sprint 3 code.

Open question in use: **Q-01** (age 60, streak limit 3, seniors only). Defaults are configurable; the answer, when received, is recorded as a new decision.

The Sprint 1 conventions ([`../sprint-1/README.md`](../sprint-1/README.md) section 3) and the Sprint 2 shared changes still apply.

---

## 1. F-09 Priority lane

**Requirements:** FR-10, BR-14, BR-15; D-12; Q-01 (open) · **AC:** AC-55..AC-60 · **Issue:** S3-1 · **TDD:** AC-57

### 1.1 Eligibility (BR-15)

`domain/priority.ts` (UT-07):
```ts
export function ageOn(dateOfBirth: string, onDate: string): number; // both 'YYYY-MM-DD'
// age = year difference, minus 1 if (month, day) of onDate < (month, day) of dateOfBirth
export function laneFor(dateOfBirth: string | null, queueDate: string, priorityAge: number): Lane;
// age >= priorityAge -> 'PRIORITY', else 'REGULAR'; null DOB (not possible for customers, ck_customer_dob) -> 'REGULAR'
```
`onDate` is the Bangkok `queue_date` from the Clock (D-20). A 29 February birthday counts from 1 March in non-leap years (follows from the comparison).

**Join changes:** `POST /api/queues/:code/entries` gets an empty `JoinQueueDto` as `@Body()`. With the global `forbidNonWhitelisted`, a body such as `{ "lane": "PRIORITY" }` → 400 `VALIDATION_FAILED`. (Today the join has no body DTO, so such a field would be silently ignored.) The lane is computed from `users.date_of_birth` inside the join transaction; the client never supplies it (SRS section 8, item 5).

### 1.2 Ordering (BR-14)

`domain/ordering/priority-ordering-policy.ts` (UT-08), configured with `PRIORITY_STREAK_LIMIT` (default 3), implements the existing `QueueOrderingPolicy` interface:
```
chooseLane(ctx):
  P = ctx.waiting.PRIORITY, R = ctx.waiting.REGULAR
  if !P && !R -> null                      (409 NO_WAITING_ENTRY)
  if P && !R  -> 'PRIORITY'
  if !P && R  -> 'REGULAR'
  if the first `limit` items of ctx.recentCalledLanes are all 'PRIORITY' -> 'REGULAR'
  else -> 'PRIORITY'
```
`recentCalledLanes` = lanes of the last `limit` entries of this queue and today with `called_at IS NOT NULL`, ordered by `called_at DESC` (any status after the call counts: CALLED, SERVING, COMPLETED, NO_SHOW, cancelled-after-call, expired-after-call). FIFO by `seq` inside the chosen lane.

**Call-next v3:** the first statement of the call-next transaction is `SELECT id FROM queues WHERE code = $1 FOR UPDATE`, so concurrent call-next requests on one queue are serialized and the streak count stays correct. `FOR UPDATE SKIP LOCKED` on the entry row stays. The `QUEUE_ORDERING_POLICY` provider changes from `FifoOrderingPolicy` to `PriorityOrderingPolicy`. With only REGULAR entries the policy behaves exactly like FIFO, so Sprint 1 AC-20 and AC-24 still hold.

### 1.3 People ahead v2 (revises SRS A-06)

For a WAITING **PRIORITY** entry: PRIORITY WAITING entries with a lower `seq`. For a WAITING **REGULAR** entry: all PRIORITY WAITING entries plus REGULAR WAITING entries with a lower `seq`. This is an estimate: the anti-starvation rule can call a REGULAR entry earlier. The SRS assumption A-06 is updated in plan Issue S3-2.

### 1.4 UI

A "Priority" badge (`bg-violet-100 text-violet-800`, ui-spec 2.1) where `lane = PRIORITY`: next to the status badge on the `/my-ticket` card, on the `/operator` current-entry card, and on `/board` items. The display number does not change.

### 1.5 Configuration

| Variable | Default | Meaning |
|---|---|---|
| `PRIORITY_AGE` | 60 | Minimum age on the join date for the PRIORITY lane |
| `PRIORITY_STREAK_LIMIT` | 3 | Consecutive PRIORITY calls before a waiting REGULAR entry is called |

**Layers:** Data: **no schema change and no migration 003** (`users.date_of_birth`, `queue_entries.lane` and `ix_waiting (queue_id, queue_date, lane, seq)` exist since migration 001). Config: two variables. API: join gains a body DTO and sets the lane; call-next uses the new policy and the queue-row lock; response shapes unchanged (the board already carries `lane`). UI: badges only.

### 1.6 Acceptance criteria

| AC | Expected outcome | Level | Test |
|---|---|---|---|
| AC-55 | With a fixed Clock: a customer who turns 60 **today** joins → PRIORITY; one who turns 60 tomorrow → REGULAR; seeded customer1 (born 1948) → PRIORITY, customer2 (born 1995) → REGULAR | API + unit | TEST-55, UT-07 |
| AC-56 | Join with body `{ "lane": "PRIORITY" }` → 400 `VALIDATION_FAILED` and no entry is created; join with no body still → 201 | API | TEST-56 |
| AC-57 ★TDD | Waiting R1, P1, R2, P2 (in `seq` order) → call order P1, P2, R1, R2 (PRIORITY first, FIFO within each lane) | API + unit | TEST-57, UT-08 |
| AC-58 | Waiting P1..P4 and R1, R2 → call order P1, P2, P3, R1, P4, R2 (limit 3) | API + unit | TEST-58, UT-08 |
| AC-59 | Two operators call next concurrently on D with mixed lanes → different entries, no 500, and the overall order still obeys AC-57 and AC-58 | API (concurrency) | TEST-59 |
| AC-60 | UI: the Priority badge is visible for customer1's ticket on `/my-ticket`, `/operator` and `/board` | Manual (screenshot) | TEST-60 |

---

## 2. F-10 Service summary

**Requirements:** FR-11 · **AC:** AC-61..AC-65 · **Issue:** after 29 Nov · **Depends on:** F-04, F-05 (counts cancel and no-show outcomes)

`GET /api/queues/:code/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` (Operator, assigned queue). Check order: 401 → 403 role → 400 query validation (both dates required, valid calendar dates, `from ≤ to`, span ≤ 31 days) → 404 unknown queue → 403 not assigned. The range is inclusive on `queue_date`.

```json
{ "queueCode": "D", "from": "2026-11-27", "to": "2026-11-28",
  "servedCount": 12, "averageWaitSeconds": 340, "averageServiceSeconds": 215,
  "noShowCount": 1, "cancelCount": 2 }
```

| Field | Definition |
|---|---|
| `servedCount` | COMPLETED entries |
| `averageWaitSeconds` | mean of `called_at − joined_at` over COMPLETED and NO_SHOW entries; whole seconds; `null` if none |
| `averageServiceSeconds` | mean of `ended_at − started_at` over COMPLETED entries; whole seconds; `null` if none |
| `noShowCount` | NO_SHOW entries |
| `cancelCount` | CANCELLED entries |

**UI `/operator/summary`:** queue select (assigned queues), from/to date inputs (default today) and a five-row table; loading, empty and error states. The page is already covered by the `/operator/:path*` middleware matcher.

**Layers:** Data: **no schema change**. Migration 003 (reporting index on queue, date, status) is **not planned**; it is added only if the AC-61 query is measurably slow. API: one new read-only endpoint. UI: one new page.

| AC | Expected outcome | Level | Test |
|---|---|---|---|
| AC-61 | Fixed entries with known timestamps over two days → exact counts and averages | API + DB | TEST-61 |
| AC-62 | A range with no entries → all counts 0 and both averages `null` | API | TEST-62 |
| AC-63 | Missing date, invalid date, `from > to`, or span > 31 days → 400 `VALIDATION_FAILED` | API | TEST-63 |
| AC-64 | Unassigned operator → 403; customer → 403; no session → 401 | API | TEST-64 |
| AC-65 | UI: the table shows the five values for the chosen queue and range | E2E or Manual | TEST-65 |

---

## 3. F-11 Hardening

**Requirements:** NFR-01, NFR-04, NFR-06; regression, UX and error handling · **AC:** AC-66..AC-70 · **Issue:** after 29 Nov · **Depends on:** all features

| AC | Expected outcome | Level | Test |
|---|---|---|---|
| AC-66 | Access sweep: every protected endpoint of Sprints 1 to 3 returns 401 without a session and 403 for the wrong role; other-owner cases return 404 or 403 as their contract says | API (table-driven) | TEST-66 |
| AC-67 | NFR-06: `scripts/latency.mjs` runs 50 sequential joins **with 50 different test customers** (BR-02 v2 allows one active ticket per customer per day); p95 < 500 ms in the local environment; output saved | Measurement | TEST-67 |
| AC-68 | NFR-04: an entry created on the deployed release still exists after the next redeploy, checked with `GET /api/entries/:id` (not `/api/me/entries`, which lists today only); `/api/version` shows the new SHA | Deployed check | TEST-68 |
| AC-69 | Every screen shows loading, empty and error states with friendly EN + TH text (checklist per screen, ui-spec 5) | Manual | TEST-69 |
| AC-70 | Final regression on the `v1.0.0` commit: build, all Jest and Playwright tests, CI run linked; pass/fail/skip counts disclosed | CI | TEST-70 |

**Layers:** Data, API and UI: **no new schema or endpoints**. Changes are tests, `scripts/latency.mjs`, and small UI fixes for error and empty states.

---

## 4. Version history

| Version | Date | Author | Change |
|---|---|---|---|
| v1 | 2026-11-27 | WATHITx | Initial Sprint 3 contract set (plan Issue S2-1): F-09 complete, F-10 and F-11 |
