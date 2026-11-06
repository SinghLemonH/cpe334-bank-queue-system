# Product Definition of Done (Sprint 1)

**DoD v1 - 2026-11-06** - Issue #5
Applies to every feature PR (F-01 #7, F-02 #9, F-03 #10) and to the Sprint 1 release (#11). **Done is shown by evidence (test output, commits, review comments), never by an AI agent's claim.**

## 1. Product Definition of Done (each feature)

A feature is **Done** only when all six hold:

| # | Criterion | Evidence |
|---|---|---|
| 1 | **Contract first.** The feature contract (feature SDS, UI/API/data spec, AC, STS) is merged into `sprint-1-staging` **before** the first implementation commit on the feature branch. | Merge commit of this PR (#5) is older than the first `feat(...)` commit; Part F history table |
| 2 | **Behavior and verification.** Every linked AC is implemented; its planned tests exist, run and pass; TDD items have red-then-green evidence. | Test output in the PR (command, commit SHA, passed/failed/skipped); `evidence/TEST-11-*.txt`, `evidence/TEST-26-*.txt` |
| 3 | **Honest tests.** No skipped, commented-out or weakened tests; any failure is disclosed. | `grep` for `.skip`/`xit`/`.only` is empty; failure list in the PR or known limitations |
| 4 | **Reviewed integration.** PR reviewed by the teammate with at least one specific check, question or finding; merged with a **merge commit** into `sprint-1-staging`; the full suite is green on staging after the merge. | PR review comment; staging test run |
| 5 | **Docs and setup current; no secrets.** README/setup reflect the change; the contract is updated (v2 + reason) if behavior differs; no secrets or real personal data committed (NFR-07). | PR diff; repo search for secrets |
| 6 | **Disclosure.** Anything not finished is listed in known limitations. | `docs/known-limitations.md` (Issue #11) |

## 1A. Manual checks (requirements without an executable AC)

`docs/traceability.md` section 5.1 records two Sprint 1 requirements that are verified by inspection, not by an automated test. Each check is run and its result recorded **at the PR that touches the area and again at the release (#11)**.

| Requirement | Check | Pass condition | Recorded in |
|---|---|---|---|
| BR-08 No financial or national-ID data | Inspect migration 001 columns of `users` and `queue_entries`, and the entry/user response shapes in the contracts and the actual JSON from TEST-10 / `GET /api/auth/me` | No column or field for money, account number, balance, amount or national ID; responses contain no `customerId`, `dateOfBirth`, `passwordHash` | #9 PR description; release evidence |
| NFR-07 No secrets in Git | `git ls-files .env` is empty; `git grep -nIE "(password|secret|token)\s*[:=]\s*['\"][^'\"]{6,}" -- . ':!package-lock.json'` reviewed; `.env.example` holds placeholders only | No real password, token or key committed; only synthetic placeholders | each feature PR review; release evidence |

These are manual checks and are labelled as such in Part F; they are not reported as automated test results.

## 2. Per-feature checklist (copy into each feature PR)

### F-01 Auth & RBAC (#7)
- [ ] Contract v1 merged before the first commit on `feature/F-01-auth`
- [ ] Scaffold alignment SA-1..SA-7, SA-9 done (README section 4)
- [ ] TEST-01..TEST-07 pass; TEST-08 (E2E-01) passes
- [ ] TEST-06 table holds the F-01 endpoints and is ready for F-02/F-03 rows
- [ ] No user id or role is read from the request body, query or headers
- [ ] Cookie flags checked in browser DevTools by the reviewer

### F-02 Join queue & my ticket (#9)
- [ ] Commit order: failing TEST-11 -> `TEST-11-red.txt` -> implementation -> `TEST-11-green.txt`
- [ ] TEST-09..TEST-17, UT-02, UT-03 pass; TEST-18 (E2E-02 part) passes
- [ ] TEST-14 run at least 5 times without a failure
- [ ] SA-8 entry mapping done; all join queries use the transaction's EntityManager
- [ ] No financial or ID fields in the entry or its response (BR-08)
- [ ] Four F-02 endpoints added to the TEST-06 table

### F-03 Operator service desk (#10)
- [ ] Commit order: failing TEST-26 + UT-01 -> `TEST-26-red.txt` -> implementation -> `TEST-26-green.txt`
- [ ] TEST-19..TEST-29, UT-01, UT-04 pass; TEST-30 (E2E-02) passes
- [ ] TEST-24 run at least 5 times without a failure
- [ ] SA-3 (assignment -> `FORBIDDEN`) and SA-8 operator mapping done
- [ ] **All** Sprint 1 tests (TEST-01..TEST-30, UT-01..UT-04) pass on the merged branch
- [ ] Five F-03 endpoints added to the TEST-06 table

## 3. Sprint 1 release Done (#11)

- [ ] F-01, F-02, F-03 each meet section 1
- [ ] On `sprint-1-staging`: `npm ci && npm run build && npm test && npm run test:e2e` pass; output saved with `git rev-parse HEAD` and `node -v`
- [ ] Manual demonstration set (STS section 4) captured as screenshots
- [ ] Release PR `sprint-1-staging` -> `main` reviewed by the teammate with a specific check, merged with a merge commit
- [ ] Annotated tag `v0.1.0-sprint1` on that merge commit; GitHub Release created; the tag is never moved
- [ ] Fresh clone of the tag: build + tests re-run; output attached to the GitHub Release
- [ ] README complete (prerequisites + versions, env vars, DB setup/migrate/seed, run/build/test, demo account procedure without real passwords)
- [ ] `docs/contributions.md`, `docs/ai-use.md`, `docs/known-limitations.md` written; `docs/traceability.md` updated with actual test files and results
- [ ] AC -> TEST -> file -> result table generated from the Jest JSON output, not typed by hand
- [ ] No secrets, tokens or real passwords in Git or the PDF

## 4. Review standard (every PR)

The reviewer:
1. Checks out the branch and runs `npm test` (and `npm run test:e2e` when UI changed).
2. Ticks the AC list in the PR against the contract.
3. For TDD PRs, confirms the failing-test commit comes before the implementation commit.
4. Writes at least one specific check, question or finding (for example "Ran TEST-24 five times, all green" or "AC-16: the 404 body has no entry fields").
5. Approves only then. Authors never approve their own PRs.

## 5. Version history

| Version | Date | Author | Change |
|---|---|---|---|
| v1 | 2026-11-06 | WATHITx | Initial Product DoD (Issue #5) |
