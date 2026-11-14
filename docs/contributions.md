# Contributions (Sprint 1)

Student A is SinghLemonH (Wichitchai Suwanno). Student B is WATHITx (Wathit Tritsananawakit). "Review" below is a comment or an approval on the PR by the other student. A few PRs were merged from a comment rather than a formal GitHub Approve review; those are marked.

| Plan | GitHub issue | PR | Author | Reviewer | What |
|---|---|---|---|---|---|
| 1 | #4 | #14 | A | B, approved | Baseline docs, Parts A-D |
| 2 | #5 | #15 | B | A, comment then merge | Sprint 1 contracts, STS, DoD |
| 3 | #6 | #12, #16 | A | B, approved on #16 | Monorepo, Compose, migration 001, seed, Jest |
| 3 follow-up | #6 | #18 | B | A, merged | Scaffold fixes used by F-01 |
| 4 | #7 | #17 | B | A, comment then merge | F-01 auth, full stack |
| 5 | #9 | #19 | A | B, approved | F-02 join queue and my ticket, TDD AC-11 |
| 6 | #10 | #20 | B | A, review comment then merge | F-03 service desk, TDD AC-26 |
| 7 | #11 | this PR, then the release PR | A | B | Evidence docs, then `main` and tag `v0.1.0-sprint1` |

Pair work was the review itself. Each PR has one author. Nobody approved their own PR.

TDD logs committed inside the feature PRs, not in this docs PR:

| Rule | Red | Green |
|---|---|---|
| AC-11 / TEST-11 | `docs/sprints/sprint-1/evidence/TEST-11-red.txt` in PR #19 | `TEST-11-green.txt` in PR #19 |
| AC-26 / TEST-26 | `docs/sprints/sprint-1/evidence/TEST-26-red.txt` in PR #20 | `TEST-26-green.txt` in PR #20 |

# Contributions (Lab 5: Cloud Deployment and CI/CD)

Same students. Issue numbers marked `#?` are filled in when the PR is opened. Cloud setup done in the Console has an Issue but no PR (handout section 9).

| Plan | GitHub issue | PR | Author | Reviewer | What |
|---|---|---|---|---|---|
| L5-1 | #? | none (Console, closed with screenshots) | B (GCP owner: budget, IAM, WIF) and A (Editor: APIs, Artifact Registry, secrets, Supabase) | each other | GCP project `cpe334-bankqueue`, budget, service accounts, Secret Manager, WIF, GitHub environment `demo`, Supabase |
| L5-2 | #24 | #27 | B | A, merged | Env config, `/api/ready`, Dockerfiles, compose `app` profile, CI `test-and-docker`, `deployment.md` v1 |
| L5-3 | #? | #28 | A | B, merged | `deploy/*.sh`, smoke test, first deploy, `deploy.yml`, ruleset; B (owner) made both Cloud Run services public |
| L5-4 | #? | this PR, then the release PR | B | A | `/api/version`, version footer, smoke test checks the deployed commit, release procedure, then `main` and tag `v0.2.0-lab5` |

Both students deployed: A ran the first deploy from Cloud Shell (L5-3); B owns the GCP project and runs the first pipeline release (L5-4).
