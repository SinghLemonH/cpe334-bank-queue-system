# Remaining work after the release candidate (Deliverable 2, Part C)

**Written:** 27 Nov 2026 (plan Issue S3-2) · **Baseline:** `v0.5.0-rc1` (Sprint 1, Sprint 2, F-09) · **Final release:** `v1.0.0` on Sun 13 Dec 2026
**Owners:** A = SinghLemonH (Wichitchai Suwanno), B = WATHITx (Wathit Tritsananawakit)

The "Current status" column is the state before the rc1 tag; it is confirmed from the CI run on the rc1 commit and updated in a docs-only commit on `sprint-3-staging` (`docs/traceability.md` section 7). Status words are the same as the STS: Planned, In progress, Implemented, Passed, Accepted.

## 1. Remaining work

| Feature / AC or defect | Current status (before rc1) | Remaining action | Depends on | Owner | Target |
|---|---|---|---|---|---|
| F-09 AC-60 Priority badge (TEST-60, manual) | Implemented (PR #56); not checked on a deployed release | Screenshots on the deployed rc1 (customer1 on `/my-ticket`, `/operator`, `/board`) into `docs/sprints/sprint-3/evidence/manual-checks.md` | rc1 deployed | A | Sun 29 Nov |
| F-05 AC-41 No-show button (TEST-41, manual) | Implemented in `v0.4.0-sprint2`; manual check not run | Run on the deployed release (queue D or L, customer2), record in `docs/sprints/sprint-2/evidence/manual-checks.md` | rc1 deployed | B | Sun 29 Nov |
| F-08 AC-54 Open/close and end-of-day screens (TEST-54, manual) | Implemented in `v0.4.0-sprint2`; manual check not run | Run on the deployed release on queue **L** (never O before the persistence check) | rc1 deployed | B | Sun 29 Nov |
| NFR-04 on GCP (persistence across the rc1 redeploy) | Persistence ticket: customer3 joins queue O on the deployed `v0.4.0-sprint2` **before** the rc1 release PR is merged; record the entry id | After the rc1 deploy: `GET /api/entries/<id>` still returns the ticket with the same number and status; then cancel it | ticket created before the rc1 deploy | A | Sat 28 Nov (ticket), Sun 29 Nov (check) |
| F-10 AC-61..AC-65 Service summary | Contract only; Planned | `GET /api/queues/:code/summary`, `/operator/summary`, TEST-61..TEST-65 | F-04, F-05 (released) | A | Mon 30 Nov |
| F-11 AC-66 Access sweep | Planned (TEST-06 already covers the Sprint 1 and 2 endpoints) | Extend TEST-06 into a role and owner table for every endpoint of Sprints 1 to 3 | F-10 endpoint merged | B | Mon 30 Nov |
| F-11 AC-67 NFR-06 latency | Planned | `scripts/latency.mjs`, 50 sequential joins by 50 test customers, p95 < 500 ms; save the output | none | B | Mon 30 Nov |
| F-11 AC-69 Error and empty states | Planned | Checklist per screen (ui-spec 5); small UI fixes | F-10 UI merged | B | Sat 12 Dec |
| F-11 AC-68 NFR-04 on the final release | Planned | Persistence check across the `v1.0.0` redeploy | final release | B | Sun 13 Dec |
| DEF-02 Join during end-of-day | Accepted known limitation | None in scope; re-check if time allows | – | B | – (documented in `docs/known-limitations.md`) |
| Q-01, Q-02 (priority age and streak, no-show grace) | Open; configurable defaults in use | Ask the TA; record the answer as a new decision in the SRS | TA reply | A | before Sat 12 Dec |
| UAT re-tests (Lab 6 #39, #40) | Fixed in `v0.3.0-lab7`, regression test passing | Re-run the accepted UAT cases on the final candidate | all fixes merged | A + B | Sat 12 Dec |
| Final release AC-70 | Planned | Full regression on the final commit, tag `v1.0.0`, deploy, demo video, final PDF | everything above | A + B | Sun 13 Dec |

## 2. Rules for the remaining time

- **Exam period 1 to 11 Dec:** no new features, defect fixes only. The targets above avoid that period on purpose. Each student checks their own exam timetable before the Deliverable 2 PDF is built and moves any target that clashes; the PDF shows the final dates.
- After `v0.5.0-rc1`, **nothing is merged into `main` until `v1.0.0`**, so the deployed version keeps matching the submitted tag. Work after rc1 goes to `sprint-3-staging` through reviewed PRs.
- F-10 and F-11 follow the contracts in `README.md` sections 2 and 3 and the STS. A change to a contract gets a version-history row first.
