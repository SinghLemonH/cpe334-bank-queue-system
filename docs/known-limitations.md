# Known limitations (Sprint 1)

These are things Sprint 1 does not do. They are not defects in the rules that Sprint 1 did implement.

Decisions that stay in the Part A decision log, and are not limitations:

- A closed queue still accepts call, start and complete for an entry that already exists (D-08, BR-09). Closing a queue only rejects a new join.
- An active entry from an earlier Bangkok date does not block the customer or the operator today (D-13). End-of-day expiry is Sprint 2.

## Not in Sprint 1

- No customer cancel, no operator no-show, and no end-of-day job. `EXPIRED` exists in the schema and is not reachable.
- No counters, no public board, and no priority lane. Every Sprint 1 ticket is `REGULAR` and ordering is FIFO by `seq`.
- Ticket status on `/my-ticket` and the operator desk updates by polling every 5 seconds. There is no realtime channel.
- No CSRF token. State-changing requests rely on a `SameSite=Lax` session cookie. This is the decision recorded in the project context (section 10), and a token remains a later hardening option.
- No application Docker image, no GitHub Actions pipeline, and no GCP deployment. Those are Lab 5. Sprint 1 runs on local Docker Postgres only.

## Acceptance criteria

No Sprint 1 acceptance criterion was dropped or marked "planned, not executed". AC-05, AC-12 and AC-29 are implemented and have tests. If a later run of the tagged commit fails or skips a test, that count is the one printed by `scripts/evidence.mjs` and by Playwright. It is attached to the GitHub Release. It is not copied into this file.

## Residual note from review of F-03

`callNext` relies on the row lock inside its transaction and does not also check that the `UPDATE` changed a row. `start` and `complete` do that check. The review on PR #20 recorded this and did not block the merge.
