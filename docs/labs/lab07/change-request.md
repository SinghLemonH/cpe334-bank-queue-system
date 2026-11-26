# Lab 7 Change Request CR-01: BR-02 v2, one active ticket per customer per day

**Status:** Approved by the team (see section 7)
**Created:** 2026-11-26
**Type:** Adaptive maintenance. The Sprint 1 behavior was correct for its requirement, and the requirement has now changed. This is not a defect fix.
**Feature:** F-02 Join queue and my ticket
**Branch:** `maint/lab7-br02-one-active-ticket`, PR into `Lab5-staging`, then a release PR into `main`

## 1. Baseline

| Item | Value |
|---|---|
| Accepted Sprint 1 baseline | Release PR #22 (`sprint-1-staging` into `main`), merge commit `0a2d8fedc050db29bd96991e66d24187fc32812d` (2026-11-07). The planned tag `v0.1.0-sprint1` was never pushed. The merge commit is the baseline. |
| Where the old rule lives in the baseline | `apps/api/src/application/queue.service.ts` `joinInTransaction()`, pre-check `WHERE queue_id = $1 AND queue_date = $2 AND customer_id = $3`. Index `uq_active_entry_per_customer (queue_id, queue_date, customer_id)` in migration `1730800000000-InitMigration.ts`. |
| Actual pre-change implementation | `main` at `a3c243f` (merge of PR #42, 2026-11-21). This is the release accepted in Lab 6 and the one deployed. |
| Intervening development | Lab 5 (Docker, CI, GCP deploy, `/api/version`) and Lab 6 fixes #39/#40 (mobile layout). None of it touches F-02 join logic. `git diff 0a2d8fe a3c243f -- apps/api/src/application/queue.service.ts` is empty. |
| Old behavior observed in acceptance | Lab 6 UAT-03: customer1 held D and L active at the same time, and both joins were accepted. |

## 2. Old and new rule

| | Old (Sprint 1, SRS v1 BR-02, AC-12) | New (BR-02 v2, AC-12 v2) |
|---|---|---|
| Rule | A customer has at most one active (WAITING, CALLED, SERVING) entry **per queue** per day. A customer **may** hold active entries in different queues at the same time. | A customer has at most one active (WAITING, CALLED, SERVING) entry **across all queues** per day. |
| Join D, then L, same day, D still active | both 201 (`D001`, `L001`) | D 201 `D001`; L **409 `DUPLICATE_ACTIVE_ENTRY`** |

## 3. Reason

Customers who take tickets in two queues at once get called at two counters together. One counter waits for a no-show. This is a form of ticket hoarding that the Sprint 1 rule allowed on purpose (D-03). The branch now wants a customer to finish one service before queueing for the next one.

## 4. Scope

In scope:
- the API rule in `QueueService.join` and its race protection
- the error message for `DUPLICATE_ACTIVE_ENTRY` (API and web)
- the F-02 contract, SRS BR-02 / D-03, STS TEST-11, TEST-12 and TEST-15, traceability and the system SDS

Out of scope:
- No new endpoint or error code
- No change to F-01 auth or F-03 operator flows
- No schema migration
- No change to entries from earlier days

## 5. Acceptance criteria (AC-12 v2), boundaries and invalid cases

| ID | Case | Expected |
|---|---|---|
| AC-12a | `c1` WAITING in D today, joins L | 409 `DUPLICATE_ACTIVE_ENTRY`. No L row. The L counter is not created or incremented. `c1` still has exactly 1 active row. |
| AC-12b (boundary) | `c1`'s D entry is CALLED or SERVING, `c1` joins L | 409 `DUPLICATE_ACTIVE_ENTRY` (all three active statuses count) |
| AC-12c (boundary) | `c1`'s D entry is COMPLETED today, `c1` joins L | 201 `L001` (a terminal status frees the slot) |
| AC-12d (boundary) | `c1` has a WAITING D entry from **yesterday** (Bangkok date), joins L today | 201 `L001` (only today's `queue_date` counts, D-13 unchanged) |
| AC-12e (race) | `c1` sends join D and join L at the same moment | exactly one 201 and one 409. `c1` has exactly 1 active row. |
| AC-11 (unchanged) | second join to the **same** queue while active | 409 `DUPLICATE_ACTIVE_ENTRY`, as before |

Invalid cases and order of checks (unchanged): unknown queue gives 404 `NOT_FOUND`. A closed queue gives 409 `QUEUE_CLOSED`, and this check runs before the active-ticket check.

Access (unchanged): only a CUSTOMER can join (an OPERATOR gets 403, anonymous gets 401). The customer is always the session user. A request body cannot choose another customer. A customer still cannot read another customer's entry (404).

## 6. Error message

The code and HTTP status stay `409 DUPLICATE_ACTIVE_ENTRY`. The text no longer says "in this queue":

| | EN | TH |
|---|---|---|
| Old | You already have an active ticket in this queue today. | คุณมีบัตรคิวที่ยังใช้งานอยู่ในคิวนี้แล้ววันนี้ |
| New | You already have an active ticket today. Finish it before joining another queue. | คุณมีบัตรคิวที่ยังใช้งานอยู่แล้ววันนี้ กรุณารอให้เสร็จก่อนรับบัตรคิวใหม่ |

## 7. Approval

| Item | Value |
|---|---|
| Instructor/TA approval | Not required. The instructor announced on the course Facebook group (Lab 7 Spec Sheet Change) that teams do not need instructor or TA approval for the change request. Teams choose the change themselves. A screenshot of the announcement is in the Lab 7 PDF. |
| Team approval | Proposed by WATHITx on 2026-11-26. Agreed by SinghLemonH in the contract review on PR (see the PR for the date). |
