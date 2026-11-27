# Sprint 2 completion (plan Issue S2-4)

**Release:** `v0.4.0-sprint2` · **Integration branch:** `sprint-2-staging` · **Contracts:** [README.md](README.md) (merged in PR #51, merge commit `2595e93`, before any implementation commit)

The results below come from actual runs, not expectations. The tag SHA and the deployed `/api/version` are recorded in the S2-4 Issue and the GitHub Release after the release PR is merged.

## 1. Regression run before the release

Run on 2026-11-27 on `sprint-2-staging` head `d8df3960dfdcda21f51684ce0c01cdd72b52568d` (PRs #51, #53, #52 merged) plus this branch's version bump. Node v24.14.0, PostgreSQL 17 (Docker).

| Check | Command | Result |
|---|---|---|
| API unit + integration (Jest) | `npm run evidence` (runs `jest --config apps/api/jest.config.ts --runInBand --ci --json`) | 19 suites; **180 passed, 0 failed, 0 skipped** |
| Production build (API + web) | `npm run build` | Passed (`/board`, `/my-ticket` built) |
| E2E (Playwright) | `npm run test:e2e` on a freshly created, migrated and seeded database | **14 passed, 0 failed, 0 skipped** (first run: 13 passed, 1 failed because `apps/web/e2e/version.spec.ts` still expected the old label `0.2.0-lab5`; updated in this branch and re-run: passed) |
| Migration 002 on an empty DB | `npm run db:migrate` | 001 and 002 executed |
| Migration 002 `down()` | `npm run --workspace=apps/api migration:revert`, then `npm run db:migrate` | Reverted (table `counters` and column `counter_id` gone), then re-applied |
| Migration 002 on existing Sprint 1 data | `npm run db:migrate` on a copy of a dev DB with 3 Sprint 1 entries | Executed; 3 entries kept with `counter_id = NULL` |
| Seed (counters, `is_open` kept) | `npm run db:seed` | 4 counters (D: Counter 1, 2; L: Counter 3; O: Counter 4); a closed queue stays closed after a re-run |

CI (`test-and-docker`) runs again on the release PRs; its run links go in the S2-4 Issue.

## 2. Completion table

Result words: **Passed** = the test ran and passed in the run above; **Planned** = not run yet.

### F-04 Customer cancel (FR-06, BR-11) — Issue S2-3, PR #53 (author WATHITx, reviewer SinghLemonH)

| AC | Implementation | Verification | Result | Release |
|---|---|---|---|---|
| AC-31 | `1ab199c` `POST /api/entries/:id/cancel` | TEST-31 `apps/api/test/integration/f04-cancel.spec.ts` | Passed | v0.4.0-sprint2 |
| AC-32 | `1ab199c` | TEST-32 (cancel × operator hold) | Passed | v0.4.0-sprint2 |
| AC-33 | `1ab199c`, `98e4b88` (transition table v2) | TEST-33, UT-06 | Passed | v0.4.0-sprint2 |
| AC-34 | `1ab199c` | TEST-34, TEST-06 row | Passed | v0.4.0-sprint2 |
| AC-35 | `1ab199c` | TEST-35 (cancel × BR-02 v2) | Passed | v0.4.0-sprint2 |
| AC-36 | `82780a4` ticket card + Cancel ticket | TEST-36 (E2E-03) `apps/web/e2e/sprint2-cancel.spec.ts` | Passed | v0.4.0-sprint2 |

### F-05 No-show (FR-07, BR-12) — Issue S2-3, PR #53

| AC | Implementation | Verification | Result | Release |
|---|---|---|---|---|
| AC-37 | `98e4b88` `POST /api/entries/:id/no-show` | TEST-37 `f05-no-show.spec.ts` | Passed | v0.4.0-sprint2 |
| AC-38 ★TDD | `98e4b88` | TEST-38, UT-05; red `290b021` → [TEST-38-red.txt](evidence/TEST-38-red.txt), green `98e4b88` → [TEST-38-green.txt](evidence/TEST-38-green.txt) | Passed | v0.4.0-sprint2 |
| AC-39 | `98e4b88` | TEST-39, TEST-06 row | Passed | v0.4.0-sprint2 |
| AC-40 | `98e4b88` | TEST-40, UT-06 | Passed | v0.4.0-sprint2 |
| AC-41 | `82780a4` `NoShowButton` | TEST-41 manual ([manual-checks.md](evidence/manual-checks.md)) on the deployed release | Planned (run after deploy) | v0.4.0-sprint2 |

### F-07 Counters + F-03 v2 (FR-09, BR-13) — Issue S2-2, PR #52 (author SinghLemonH, reviewer WATHITx)

| AC | Implementation | Verification | Result | Release |
|---|---|---|---|---|
| AC-42 | `154f613` migration 002, call-next `{ counterId }`; `4e99412` counter selector | TEST-42 `apps/api/test/integration/f07-counters.spec.ts` | Passed | v0.4.0-sprint2 |
| AC-43 ★TDD | `154f613` | TEST-43; red `e17c90c` → [TEST-43-red.txt](evidence/TEST-43-red.txt), green `154f613` → [TEST-43-green.txt](evidence/TEST-43-green.txt) (committed together with the implementation) | Passed | v0.4.0-sprint2 |
| AC-44 | `154f613` | TEST-44 | Passed | v0.4.0-sprint2 |
| AC-45 | `154f613` | TEST-45 (call-next without body = Sprint 1) | Passed | v0.4.0-sprint2 |
| AC-46 | `154f613` | TEST-46, TEST-06 row | Passed | v0.4.0-sprint2 |

### F-06 Public board (FR-08, NFR-05) — Issue S2-2, PR #52

| AC | Implementation | Verification | Result | Release |
|---|---|---|---|---|
| AC-47 | `683e362` `GET /api/public/board`, `/board` | TEST-47 `apps/api/test/integration/f06-board.spec.ts` | Passed | v0.4.0-sprint2 |
| AC-48 | `683e362` | TEST-48 (exact keys, no personal data) | Passed | v0.4.0-sprint2 |
| AC-49 | `683e362`, `4e99412` | TEST-49 (E2E-04) `apps/web/e2e/sprint2-board.spec.ts` | Passed | v0.4.0-sprint2 |

### F-08 Open/close and end-of-day (FR-12, BR-09, BR-16) — Issue S2-3, PR #53

| AC | Implementation | Verification | Result | Release |
|---|---|---|---|---|
| AC-50 | `397d538` `PATCH /api/queues/:code`; `dfbe17a` seed keeps `is_open` | TEST-50 `f08-open-close.spec.ts` | Passed | v0.4.0-sprint2 |
| AC-51 | `397d538` | TEST-51 (closed queue × service desk) | Passed | v0.4.0-sprint2 |
| AC-52 | `397d538` `POST /api/queues/:code/end-day` | TEST-52, UT-06 | Passed | v0.4.0-sprint2 |
| AC-53 | `397d538` | TEST-53, two TEST-06 rows | Passed | v0.4.0-sprint2 |
| AC-54 | `82780a4` `QueueControls` | TEST-54 manual ([manual-checks.md](evidence/manual-checks.md)) on the deployed release | Planned (run after deploy) | v0.4.0-sprint2 |

## 3. Summary

- 24 Sprint 2 AC: **22 Passed** by automated tests (20 API/unit, 2 E2E); **2 Planned** manual UI checks (AC-41, AC-54), which run on the deployed `v0.4.0-sprint2` and are recorded in `evidence/manual-checks.md`. Their rules are covered by passing automated tests (TEST-37, TEST-38, UT-05; TEST-50..TEST-53).
- All Sprint 1 tests, the Lab 6 regression tests and Lab 7 TEST-12 v2 pass in the same run. No test was skipped, deleted or weakened.
- No Sprint 2 feature was moved to Sprint 3.
- Known limitation DEF-02 (a join committing during end-of-day may leave one WAITING entry; run end-of-day again) is documented in the F-08 contract.
- Schedule: Sprint 2 was planned for 9–23 Nov and was built on 26–27 Nov (Lab 5–7 work took the earlier time); disclosed as PROC-03 in the change register.
