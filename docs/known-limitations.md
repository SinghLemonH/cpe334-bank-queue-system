# Known limitations

Updated 27 Nov 2026 for the Deliverable 2 release candidate (`v0.5.0-rc1`: Sprint 1, Sprint 2 and F-09). The Sprint 1 list is kept below as it was written, with a note where a later sprint removed the limitation.

These are things the release does not do. They are not defects in the rules that were implemented.

Decisions that stay in the decision log, and are not limitations:

- A closed queue still accepts call, start, complete and no-show for an entry that already exists (D-08, BR-09). Closing a queue only rejects a new join.
- An active entry from an earlier Bangkok date does not block the customer or the operator today (D-13). End-of-day expires only **today's** WAITING and CALLED entries (D-27); entries from earlier days are left as they are.
- End-of-day does not touch a SERVING entry (D-27); the operator completes it.

## At the release candidate (`v0.5.0-rc1`)

| ID | Limitation | Effect | Workaround or plan |
|---|---|---|---|
| DEF-02 | A join that commits while end-of-day is running can leave one WAITING entry after end-of-day finishes (the join started before the queue was closed). | The queue is closed, but one ticket stays WAITING. | Run end-of-day again; it expires the leftover. Accepted, not fixed in scope (`docs/sprints/sprint-3/remaining-work.md`). |
| F-10 | No service summary yet (FR-11). | `/operator/summary` and `GET /api/queues/:code/summary` do not exist. | Planned for 30 Nov. |
| F-11 | No full access sweep (AC-66), no latency measurement (NFR-06, AC-67), no per-screen error and empty state checklist (AC-69). | Sprint 1 and Sprint 2 endpoints are covered by TEST-06; the latency target is not measured. | Planned for 30 Nov to 12 Dec. |
| Q-01, Q-02 | The priority age (60), streak limit (3) and no-show grace (2 minutes) are working defaults; no answer from the TA yet. | The rules may change. | All three are environment variables (`PRIORITY_AGE`, `PRIORITY_STREAK_LIMIT`, `NO_SHOW_GRACE_MINUTES`). |
| People ahead | For a REGULAR ticket, people ahead counts every waiting PRIORITY ticket, so it is an estimate: the anti-starvation rule can call a REGULAR ticket earlier (SRS A-06 v2). | The number can drop by more than one at a time. | Accepted by design. |
| Manual UI checks | AC-41 (no-show button), AC-54 (open/close and end-of-day screens) and AC-60 (priority badge) are checked by hand on the deployed release, not by an automated test. | | Their rules are covered by passing API and unit tests. |
| Board refresh | `/board`, `/my-ticket` and `/operator` update by polling (every 5 seconds); there is no push channel (A-07). | Up to a few seconds of delay. | Accepted. |
| CSRF | No CSRF token; state-changing requests rely on the `SameSite=Lax` session cookie (SDS 5.5). | | Hardening option. |

## Not in Sprint 1 (written 8 Nov 2026)

- No customer cancel, no operator no-show, and no end-of-day job. `EXPIRED` exists in the schema and is not reachable. *(Done in Sprint 2: F-04, F-05, F-08.)*
- No counters, no public board, and no priority lane. Every Sprint 1 ticket is `REGULAR` and ordering is FIFO by `seq`. *(Counters and board in Sprint 2: F-07, F-06; priority lane in Sprint 3: F-09.)*
- Ticket status on `/my-ticket` and the operator desk updates by polling every 5 seconds. There is no realtime channel.
- No CSRF token. State-changing requests rely on a `SameSite=Lax` session cookie. This is the decision recorded in the project context (section 10), and a token remains a later hardening option.
- No application Docker image, no GitHub Actions pipeline, and no GCP deployment. Those are Lab 5. Sprint 1 runs on local Docker Postgres only. *(Done in Lab 5, `v0.2.0-lab5`.)*

## Acceptance criteria

No Sprint 1 acceptance criterion was dropped or marked "planned, not executed". AC-05, AC-12 and AC-29 are implemented and have tests. If a later run of the tagged commit fails or skips a test, that count is the one printed by `scripts/evidence.mjs` and by Playwright. It is attached to the GitHub Release. It is not copied into this file.

No Sprint 2 acceptance criterion was moved to Sprint 3. AC-41 and AC-54 are manual checks by design (Sprint 2 STS section 1).

## Residual note from review of F-03

`callNext` relies on the row lock inside its transaction and does not also check that the `UPDATE` changed a row. `start` and `complete` do that check. The review on PR #20 recorded this and did not block the merge.
