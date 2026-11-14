# AI use (Sprint 1)

Both students used AI assistants to draft documents, tests and implementation, then reviewed the result before merging. The human author of each PR remains responsible for what was merged.

| Where | Tool recorded | What it helped with |
|---|---|---|
| Parts A-D, Sprint 1 contracts, scaffold, F-01, F-02, F-03 | AI coding assistants in the IDE (Cursor; F-03 commits are also marked Co-Authored-By Claude Opus 5.5) | Drafting contracts, NestJS and Next.js code, Jest and Playwright tests, and review notes |
| This evidence PR (Issue #11) | Cursor agent | README, the evidence script, contribution and limitation notes, and the traceability file list |

The assistants did not replace the red-then-green commits. TEST-11 and TEST-26 were committed failing, with their logs, before the implementation commits. Test output in the GitHub Release is from a local run, not from an assistant's claim that the tests passed.

# AI use (Lab 5)

| Where | Tool recorded | What it helped with | What the students checked |
|---|---|---|---|
| Lab 5 plan and Issues L5-1..L5-4 | Claude Code (desktop) | Reading the handout and starter kit, splitting the work into four Issues | Issue scope against the R-01..R-12 table |
| L5-1 cloud setup | Claude Code (desktop) | Proposed `gcloud` commands for IAM bindings and WIF | The owner read every command before running it in Cloud Shell; no agent ran `gcloud`, changed billing, or saw a password. Secrets were entered with `read -s` |
| L5-2 (#27) | Claude Code (desktop); commits marked Co-Authored-By Claude Opus 5.5 | Env config, `/api/ready`, Dockerfiles, compose profile, CI workflow, `deployment.md` v1 | Local lint, build, 98 Jest tests, and the C-03 fresh-clone Docker run; reviewer re-ran C-03 |
| L5-3 (#28) | AI coding assistant (see PR) | Deploy scripts and `deploy.yml` adapted from the starter kit | First deploy and smoke test against the live URL |
| L5-4 (this PR) | Claude Code (desktop); commits marked Co-Authored-By Claude Opus 5.5 | `/api/version`, footer, smoke test commit check, release procedure | Tests below, then the live `/api/version` after the pipeline deploy |

Rules followed (handout section 9): no secret, password, or connection string was pasted into an agent chat; agents did not change billing, IAM, or databases on their own; when a build failed (a disk-full Docker build that produced an empty `main.js`), the cause was found from the log before anything was changed.
