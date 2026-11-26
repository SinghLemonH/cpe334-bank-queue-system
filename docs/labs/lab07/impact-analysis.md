# Lab 7 CR-01 Impact Analysis (BR-02 v2)

**Version 1 - 2026-11-26** - written before any code change. Change request: [change-request.md](change-request.md).

## 1. Trace table

| Req ID | Feature | SRS | Feature SDS (contract) | System SDS | AC | STS tests | Code modules |
|---|---|---|---|---|---|---|---|
| BR-02 (v1 → v2) | F-02 Join queue | 4 BR-02; 8 D-03 | `F-02-join-queue.md` 1.1 workflow, 2 rules, 4.2 errors, 5.1 messages, 6 data, 8 AC | 2.4 "Join" step 2; data constraints table | AC-11 (unchanged), **AC-12 v2** | TEST-11 (kept), **TEST-12 v2** (revised + new cases), **TEST-15 v2** (setup revised), TEST-18 (message text) | `apps/api/src/application/queue.service.ts`, `apps/api/src/infrastructure/pg-errors.ts`, `apps/web/src/lib/errors.ts`, `apps/web/e2e/sprint1-journey.spec.ts` |
| BR-01, NFR-03 | F-02 | 4 | 2 | 2.4 | AC-14 | TEST-14 (regression) | `queue.service.ts` (the counter upsert is not changed) |
| BR-09, BR-10, D-13 | F-02 | 4 | 2 | - | AC-13, AC-15 | TEST-13, TEST-15 (regression) | `queue.service.ts` |
| FR-03, D-07 | F-02 | 3 | 3 | permission matrix | AC-16, AC-17 | TEST-16, TEST-17 (regression) | `entry.controller.ts`, `queue.controller.ts` (not changed) |
| FR-04, BR-03..BR-07 | F-03 Service desk | 3, 4 | F-03 contract | 2.4 "Call next" | AC-19..AC-30 | TEST-19..TEST-30 (regression) | `service-desk.service.ts` (not changed) |

## 2. Impact checklist

| Area | Impact | Decision |
|---|---|---|
| Callers / dependencies | Only `QueueController.join` calls `QueueService.join`. F-03 reads entries but never creates them. | Change `joinInTransaction()` only. |
| API validation | Same endpoint, same status 409, same code `DUPLICATE_ACTIVE_ENTRY`. Only the message text changes. | No DTO or route change. |
| UI | `/queues` already shows the message for this code with a "View my ticket" link. | Change the EN/TH text in `lib/errors.ts`. Update the TEST-18 text assertion. |
| Roles / ownership | Customer id still comes from the session. Operators are still 403. | No change. TEST-10 (extra), TEST-16 and TEST-17 protect it. |
| Race condition | The DB index `uq_active_entry_per_customer` is per queue, so it cannot stop "join D" and "join L" at the same moment. | Take `pg_advisory_xact_lock` on (customer, queue date) at the start of the join transaction, before the pre-check. Two joins from the same customer are serialized. Joins from different customers do not wait for each other (TEST-14 still runs in parallel). |
| Persistence / migration | **Not applicable.** A new unique index on `(customer_id, queue_date)` would fail on existing rows. Those rows are valid under the old rule (Lab 6 UAT-03 left customer1 with D and L on the same date). Changing history to make it fit would rewrite accepted data. | No migration. Keep `uq_active_entry_per_customer` as the per-queue safety net (AC-11). |
| Historical data | Earlier days are never checked (D-13). Rows that held two queues under v1 stay as they are. | No data fix. |
| Calculation precision / transactions | Numbering is unchanged. A rejected join happens before the counter upsert, so no number is used up. | TEST-12 v2 asserts that the L counter is not created. |
| Other features (F-01 auth, F-03 desk, Lab 5 version/health) | Not touched. | Regression suites below. |

## 3. Behavior that must stay the same, and how it is protected

| Preserved behavior | Protected by |
|---|---|
| Same-queue duplicate is rejected and the counter is unchanged (AC-11) | TEST-11, unchanged |
| A completed ticket frees the slot the same day | TEST-12 (extra), unchanged (same queue) and TEST-12 v2 boundary (other queue) |
| 20 concurrent joins by different customers get seq 1..20 (BR-01, NFR-03) | TEST-14, unchanged |
| Closed queue / unknown code | TEST-13, unchanged |
| Bangkok midnight restart; yesterday's active entry does not block | TEST-15 (setup revised, assertions kept) |
| Ownership: own entry 200, other's 404, operator 403; operator cannot join | TEST-16, TEST-17, TEST-06 |
| Operator workflow and Sprint 1 E2E journey | f03 suite TEST-19..TEST-29, Playwright TEST-18 / TEST-30 |

## 4. Tests whose expected result legitimately changes

| Test | v1 expectation | v2 expectation | Why |
|---|---|---|---|
| TEST-12 "the same customer can be active in two queues" | D 201 and L 201, 2 active rows | D 201, L 409, 1 active row, no L counter | This is the rule being changed (AC-12 v2). |
| TEST-15 | `c1` joins D and then L before midnight to check per-queue numbering | a new customer `c3` joins L instead of `c1` (`c1` and `c2` both hold D). The numbering and midnight assertions stay the same. | Under v2, `c1`'s second join would be rejected. That has nothing to do with what TEST-15 checks. |
| TEST-18 (E2E) | duplicate text "in this queue today" | new text from CR-01 section 6 | The message changed. The behavior checked (409 + link) is the same. |

New tests added: TEST-12 v2 boundary cases (CALLED/SERVING block, COMPLETED frees, yesterday does not block) and the race case.
