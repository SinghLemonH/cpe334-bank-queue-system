# Sprint 3 Software Test Specification (STS)

**STS v1 - 2026-11-27** - plan Issue S2-1
**Covers:** AC-55..AC-70 via TEST-55..TEST-70, UT-07, UT-08
**Contracts:** [README.md](README.md)

## 1. Strategy and status

Same levels, tools, fixtures and rules as the Sprint 2 STS ([`../sprint-2/sts.md`](../sprint-2/sts.md) section 1). Fixture addition **`FX3`**: customers with fixed dates of birth relative to the test Clock (`2026-11-06`, Bangkok): `s60` born 1966-11-06 (turns 60 today), `s59` born 1966-11-07 (turns 60 tomorrow), plus regular customers `r1..r4` and seniors `p1..p4` (born 1950).

Status words: **Planned** (designed, not written) → **In progress** → **Implemented** (code and test exist) → **Passed** (test ran and passed in CI on a named commit) → **Accepted** (in a release). A test is never reported as Passed without a run.

| Test | AC | Level | File | Status target at 29 Nov |
|---|---|---|---|---|
| TEST-55, UT-07 | AC-55 | API + unit | `apps/api/test/integration/f09-priority.spec.ts`, `apps/api/test/unit/priority-age.spec.ts` | Passed |
| TEST-56 | AC-56 | API | f09-priority.spec.ts | Passed |
| TEST-57 ★, UT-08 | AC-57 | API + unit | f09-priority.spec.ts, `apps/api/test/unit/priority-ordering-policy.spec.ts` | Passed (TDD red/green saved) |
| TEST-58 | AC-58 | API + unit | f09-priority.spec.ts, priority-ordering-policy.spec.ts | Passed |
| TEST-59 | AC-59 | API (concurrency) | f09-priority.spec.ts | Passed, or Planned with the reason disclosed |
| TEST-60 | AC-60 | Manual | `docs/sprints/sprint-3/evidence/manual-checks.md` | Passed on the deployed `v0.5.0-rc1` |
| TEST-61..TEST-65 | AC-61..AC-65 | API + DB / E2E or Manual | `apps/api/test/integration/f10-summary.spec.ts` | Planned |
| TEST-66..TEST-70 | AC-66..AC-70 | see section 2.3 | various | Planned |

### 1.1 TDD plan
| Rule | Test(s) | Red evidence | Green evidence | Issue |
|---|---|---|---|---|
| BR-14 priority before regular (AC-57) | TEST-57 + UT-08 | `docs/sprints/sprint-3/evidence/TEST-57-red.txt` | `TEST-57-green.txt` | S3-1 |

## 2. Test cases

### 2.1 F-09 Priority lane

| Test | AC | Setup / input | Expected |
|---|---|---|---|
| UT-07 | AC-55 | `ageOn('1966-11-06','2026-11-06')`, `ageOn('1966-11-07','2026-11-06')`, `ageOn('1964-02-29','2025-02-28')`, `laneFor(dob, date, 60)` | 60, 59, 60 (birthday not yet: 61 only from 1 Mar), PRIORITY for ≥ 60 else REGULAR |
| TEST-55 | AC-55 | FX + FX3; `s60` joins D; `s59` joins L | `s60` entry `lane` PRIORITY; `s59` entry `lane` REGULAR (also checked in the DB) |
| TEST-56 | AC-56 | `r1` joins D with body `{ "lane": "PRIORITY" }`; then joins with no body | 400 `VALIDATION_FAILED`, no row created; then 201 REGULAR |
| UT-08 | AC-57, AC-58 | `chooseLane` with every combination of `waiting` flags and `recentCalledLanes` `[]`, `[P]`, `[P,P]`, `[P,P,P]`, `[R,P,P]` (limit 3) | null / only-lane / PRIORITY / REGULAR exactly as README 1.2 |
| TEST-57 ★ | AC-57 | Join order on D: `r1`, `p1`, `r2`, `p2`; teller1 calls and completes four times | Called order `p1`, `p2`, `r1`, `r2` |
| TEST-58 | AC-58 | Join order on D: `p1`, `p2`, `p3`, `p4`, `r1`, `r2`; teller1 calls and completes six times | Called order `p1`, `p2`, `p3`, `r1`, `p4`, `r2` |
| TEST-59 | AC-59 | Same data as TEST-58; teller1 and teller2 call next with `Promise.all`, complete, repeat 3 times | Six distinct entries; no 500; the called sequence by `called_at` equals the TEST-58 order |
| TEST-60 | AC-60 | Deployed rc1: customer1 (born 1948) joins D; operator calls | Screenshots: Priority badge on `/my-ticket`, `/operator`, `/board` |

Regression: Sprint 1 TEST-20 and TEST-24 (FIFO and concurrency with REGULAR only) must still pass with `PriorityOrderingPolicy`.

### 2.2 F-10 Service summary - `apps/api/test/integration/f10-summary.spec.ts` (Planned)

| Test | AC | Setup / input | Expected |
|---|---|---|---|
| TEST-61 | AC-61 | Two days on D with fixed timestamps: 3 COMPLETED (waits 60/120/180 s, service 30/60/90 s), 1 NO_SHOW (wait 240 s), 2 CANCELLED; `GET ?from=day1&to=day2` | `servedCount` 3, `averageWaitSeconds` 150, `averageServiceSeconds` 60, `noShowCount` 1, `cancelCount` 2 |
| TEST-62 | AC-62 | Range with no entries | counts 0, averages `null` |
| TEST-63 | AC-63 | Missing `from`; `from=2026-13-01`; `from > to`; 32-day span | 400 `VALIDATION_FAILED` each |
| TEST-64 | AC-64 | loanofficer1 on D; c1; no session | 403; 403; 401 |
| TEST-65 | AC-65 | `/operator/summary` for D and today after a short journey | Table shows the five values matching the API |

### 2.3 F-11 Hardening (Planned)

| Test | AC | Method | Pass condition |
|---|---|---|---|
| TEST-66 | AC-66 | Extend the TEST-06 table into a role and owner table for every endpoint of Sprints 1 to 3 | Every row returns the contract status |
| TEST-67 | AC-67 | `node scripts/latency.mjs` against the local stack: 50 sequential joins by 50 test customers | p95 < 500 ms; output saved in `docs/sprints/sprint-3/evidence/` |
| TEST-68 | AC-68 | Create an entry on the deployed release; redeploy; `GET /api/entries/:id` | Same entry and status; `/api/version` shows the new SHA |
| TEST-69 | AC-69 | Checklist per screen (`/login`, `/queues`, `/my-ticket`, `/operator`, `/operator/summary`, `/board`) | Loading, empty and error states present with EN + TH text |
| TEST-70 | AC-70 | CI run on the `v1.0.0` commit | Build and all tests pass; counts disclosed |

## 3. Version history

| Version | Date | Author | Change |
|---|---|---|---|
| v1 | 2026-11-27 | WATHITx | Initial Sprint 3 STS (plan Issue S2-1) |
