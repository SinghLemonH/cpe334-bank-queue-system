# Sprint 2 Definition of Done

**DoD v1 - 2026-11-27** - plan Issue S2-1
Applies to the Sprint 2 feature PRs (S2-2: F-07 + F-06; S2-3: F-04 + F-05 + F-08) and the Sprint 2 release (S2-4). The Sprint 1 Product DoD ([`../sprint-1/dod.md`](../sprint-1/dod.md) sections 1, 1A and 4) still applies unchanged; this file adds the Sprint 2 specifics. **Done is shown by evidence (test output, commits, review comments), never by an AI agent's claim.**

## 1. Feature PR checklist (copy into each Sprint 2 feature PR)

- [ ] The Sprint 2 contracts (S2-1) were merged into `sprint-2-staging` before the first implementation commit on the branch; any contract change has a version row and a reason
- [ ] Every AC of the feature has a test titled with its ID; all automated ones run in CI on this PR and **pass**; manual ones (TEST-41, TEST-54) have a written procedure
- [ ] TDD item: the failing-test commit comes before the implementation commit; red and green outputs saved in `docs/sprints/sprint-2/evidence/` (S2-3: TEST-38; S2-2: TEST-43)
- [ ] New protected endpoints are in `protected-endpoints.ts`; 401, 403 and 404 cases are tested
- [ ] All Sprint 1 tests, the Lab 6 regression tests and Lab 7 TEST-12 v2 still pass; no `.skip`, `.only`, `xit` or weakened assertion (`git grep -nE "\.(skip|only)\(|\bxit\(" apps` is empty)
- [ ] Every "now" comes from the Clock; every state change is a conditional `UPDATE` (0 rows → 409)
- [ ] UI has loading, empty and error states; new error codes are mapped in `lib/errors.ts` (EN + TH)
- [ ] Migration (S2-2 only): has `down()`; run locally on an empty DB and on a DB with Sprint 1 data, plus one revert and re-run
- [ ] Seed is idempotent; `.env.example` and README updated when configuration changed
- [ ] No secrets (Sprint 1 DoD 1A, NFR-07 check); no financial or ID fields in new responses (BR-08)
- [ ] `npm run lint` and `npm run build` pass
- [ ] Reviewed by the other student with at least one specific check or finding; merged with a **merge commit**

### Per-PR specifics

**S2-2 (F-07 + F-06)**
- [ ] TEST-42..TEST-49 pass; TEST-43 red/green saved
- [ ] TEST-10 key set includes `counterLabel` in the same commit as the entry-shape change
- [ ] All Sprint 1 call-next tests unchanged and green (D-22)
- [ ] The reviewer opens `/board` in a private window and reads the board JSON for personal data (NFR-05)
- [ ] Web wiring in `operator/page.tsx`, `lib/api.ts` and `seedCounters()` done only after S2-3 was merged into the branch

**S2-3 (F-04 + F-05 + F-08 + `/my-ticket` card)**
- [ ] TEST-31..TEST-40, TEST-50..TEST-53, UT-05, UT-06 pass; TEST-36 passes; TEST-38 red/green saved
- [ ] Grace boundary tested on both sides with `ManualClock`
- [ ] Seed no longer resets `is_open`
- [ ] `/my-ticket` keeps `data-testid="ticket"` and the texts asserted by `sprint1-journey.spec.ts`; no horizontal scroll at 375 px
- [ ] `docs/ui-spec.md` v1.2 rules followed (zigzag card, amber notice)

## 2. Sprint 2 release Done (S2-4)

- [ ] F-04..F-08 each meet section 1; AC-31..AC-54 are Passed, or any that are not are disclosed with the reason
- [ ] On `sprint-2-staging`: `npm ci && npm run build && npm test && npm run test:e2e` pass; output saved with `git rev-parse HEAD` and pass/fail/skip counts
- [ ] `APP_VERSION` is `0.4.0-sprint2` in `version.controller.ts` and `version.spec.ts`
- [ ] `docs/sprints/sprint-2/completion.md`: per feature, AC → implementation PR/commit → test → result → release, filled from the actual run
- [ ] Release PR `sprint-2-staging` → `main` reviewed with a specific check and merged with a merge commit (this deploys)
- [ ] Annotated tag `v0.4.0-sprint2` on that merge commit; GitHub Release created; the tag is never moved. Late tag `v0.1.0-sprint1` on `0a2d8fe` pushed (D-26)
- [ ] Deployed `/api/version` reports the tag SHA and `0.4.0-sprint2`
- [ ] Post-deploy: critical journey works, `/board` opens without login, persistence ticket created (customer3, queue O) and its id recorded for the next redeploy check (NFR-04)
- [ ] Manual checks TEST-41 and TEST-54 recorded with screenshots in `evidence/manual-checks.md`

## 3. Version history

| Version | Date | Author | Change |
|---|---|---|---|
| v1 | 2026-11-27 | WATHITx | Initial Sprint 2 DoD (plan Issue S2-1) |
