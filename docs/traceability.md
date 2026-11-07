# Requirements Traceability Matrix: Bank Branch Queue System

Version 1.1 (7 Nov 2026). Requirement definitions are in `docs/srs.md`; feature descriptions are in `docs/features.md`. Version 1.1 records the Sprint 1 test files and marks those rows implemented. It does not record pass counts.

## 1. How to read this document

- **Sprint 1 requirements** are linked to acceptance criteria (AC) and planned tests. The AC and TEST IDs are pre-assigned one to one (`AC-NN` is verified by `TEST-NN`). The three UI criteria AC-08, AC-18 and AC-30 are verified by Playwright tests titled TEST-08, TEST-18 and TEST-30 (E2E-01 and E2E-02).
- **Sprint 2 and Sprint 3 requirements** are allocated to a feature and a sprint now. Their AC and TEST IDs are assigned in that sprint's contract (Issue #8 for Sprint 2, Issue #13 for Sprint 3) and are deliberately not listed yet. The "planned verification" column states the intended approach only.
- **Status** `Implemented` means the Sprint 1 code and its test file are on `sprint-1-staging`. It does not mean a pass count. Pass, fail and skip counts are printed by `scripts/evidence.mjs` (Jest) and by `npm run test:e2e` (Playwright) on a fresh clone of tag `v0.1.0-sprint1`, and that console log is attached to the GitHub Release. `Status` stays `Planned` for Sprint 2 and Sprint 3.

## 2. Requirement to feature to sprint to verification

### 2.1 Functional requirements

| Requirement | Feature | Sprint | AC / TEST (Sprint 1) or planned verification | Status |
|---|---|---|---|---|
| FR-01 | F-01 Auth and RBAC | Sprint 1 | AC-01, AC-02, AC-03, AC-04, AC-05, AC-08 / TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-08 | Implemented |
| FR-02 | F-02 Join queue and my ticket | Sprint 1 | AC-09, AC-10, AC-17, AC-18 / TEST-09, TEST-10, TEST-17, TEST-18 | Implemented |
| FR-03 | F-02 Join queue and my ticket | Sprint 1 | AC-10, AC-16, AC-18 / TEST-10, TEST-16, TEST-18 | Implemented |
| FR-04 | F-03 Operator service desk | Sprint 1 | AC-20, AC-21, AC-28, AC-30 / TEST-20, TEST-21, TEST-28, TEST-30 | Implemented |
| FR-05 | F-03 Operator service desk | Sprint 1 | AC-25, AC-28, AC-30 / TEST-25, TEST-28, TEST-30 | Implemented |
| FR-06 | F-04 Customer cancel | Sprint 2 | IDs assigned in the Sprint 2 contract. Planned: API tests for cancelling own WAITING/CALLED entry and rejecting other states; UI cancel on /my-ticket; E2E-03 | Planned |
| FR-07 | F-05 No-show handling | Sprint 2 | IDs assigned in the Sprint 2 contract. Planned: API tests for no-show by the calling operator; UI action on /operator; E2E-03 | Planned |
| FR-08 | F-06 Public board | Sprint 2 | IDs assigned in the Sprint 2 contract. Planned: API test of the board response; E2E-04 (/board) | Planned |
| FR-09 | F-07 Counters | Sprint 2 | IDs assigned in the Sprint 2 contract. Planned: API tests: call-next records the counter; UI counter selector | Planned |
| FR-10 | F-09 Priority lane | Sprint 3 | IDs assigned in the Sprint 3 contract. Planned: API tests: senior who joins last is called first; badge shown in UI | Planned |
| FR-11 | F-10 Service summary | Sprint 3 | IDs assigned in the Sprint 3 contract. Planned: API test of summary numbers against known fixtures; table on /operator/summary | Planned |
| FR-12 | F-08 Queue open/close and end-of-day | Sprint 2 | IDs assigned in the Sprint 2 contract. Planned: API tests for open/close (join rejected, serving continues) and end-day | Planned |
| FR-13 | F-03 Operator service desk | Sprint 1 | AC-19, AC-30 / TEST-19, TEST-30 | Implemented |

### 2.2 Business rules

| Requirement | Feature | Sprint | AC / TEST (Sprint 1) or planned verification | Status |
|---|---|---|---|---|
| BR-01 | F-02 Join queue and my ticket | Sprint 1 | AC-10, AC-14, AC-15 / TEST-10, TEST-14, TEST-15 | Implemented |
| BR-02 | F-02 Join queue and my ticket | Sprint 1 | AC-11, AC-12 / TEST-11, TEST-12 | Implemented |
| BR-03 | F-03 Operator service desk | Sprint 1 | AC-20, AC-24 / TEST-20, TEST-24 | Implemented |
| BR-04 | F-03 Operator service desk | Sprint 1 | AC-26 / TEST-26 | Implemented |
| BR-05 | F-03 Operator service desk | Sprint 1 | AC-19, AC-23 / TEST-19, TEST-23 | Implemented |
| BR-06 | F-03 Operator service desk | Sprint 1 | AC-22 / TEST-22 | Implemented |
| BR-07 | F-03 Operator service desk | Sprint 1 | AC-24, AC-27 / TEST-24, TEST-27 | Implemented |
| BR-08 | F-02 Join queue and my ticket | Sprint 1 | No executable test (manual check, see section 5) | Manual check |
| BR-09 | F-02 Join queue and my ticket | Sprint 1 | AC-13 / TEST-13 | Implemented |
| BR-10 | F-02 Join queue and my ticket | Sprint 1 | AC-15 / TEST-15 | Implemented |
| BR-11 | F-04 Customer cancel | Sprint 2 | IDs assigned in the Sprint 2 contract. Planned: API tests: another customer's entry returns 404, terminal entries are rejected | Planned |
| BR-12 | F-05 No-show handling | Sprint 2 | IDs assigned in the Sprint 2 contract. Planned: TDD with a fixed Clock around the grace-period boundary (TEST red then green) | Planned |
| BR-13 | F-07 Counters | Sprint 2 | IDs assigned in the Sprint 2 contract. Planned: API test: second call on an occupied counter is rejected (migration 002 index) | Planned |
| BR-14 | F-09 Priority lane | Sprint 3 | IDs assigned in the Sprint 3 contract. Planned: Unit tests for PriorityOrderingPolicy (FIFO in lane, anti-starvation after 3); API test under concurrency | Planned |
| BR-15 | F-09 Priority lane | Sprint 3 | IDs assigned in the Sprint 3 contract. Planned: API tests: no request field can set the lane; age boundary (turns 60 today vs tomorrow) with a fixed Clock | Planned |
| BR-16 | F-08 Queue open/close and end-of-day | Sprint 2 | IDs assigned in the Sprint 2 contract. Planned: API test: leftover WAITING/CALLED entries become EXPIRED and the queue is closed | Planned |

### 2.3 Non-functional requirements

| Requirement | Feature | Sprint | AC / TEST (Sprint 1) or planned verification | Status |
|---|---|---|---|---|
| NFR-01 | F-01 Auth and RBAC | Sprint 1 | AC-03, AC-06 / TEST-03, TEST-06 | Implemented |
| NFR-02 | F-01 Auth and RBAC | Sprint 1 | AC-07 / TEST-07 | Implemented |
| NFR-03 | F-02 Join queue and my ticket | Sprint 1 | AC-14 / TEST-14 | Implemented |
| NFR-04 | F-03 Operator service desk | Sprint 1 | AC-29 / TEST-29. Sprint 2: deployment persistence check on GCP (Lab 5) | Implemented locally; GCP is Lab 5 |
| NFR-05 | F-06 Public board | Sprint 2 | IDs assigned in the Sprint 2 contract. Planned: API test asserting the exact set of keys in the board response | Planned |
| NFR-06 | F-11 Hardening | Sprint 3 | IDs assigned in the Sprint 3 contract. Planned: Measurement script over 50 sequential joins; result saved with the commit | Planned |
| NFR-07 | F-01 Auth and RBAC | Sprint 1 | No executable test (manual check, see section 5) | Manual check |

Note: NFR-04 is established and verified locally in Sprint 1 and verified again on the GCP deployment in Sprint 2.

## 3. Sprint 1 acceptance criteria to requirements

Every Sprint 1 AC traces back to at least one requirement.

| AC | Expected outcome (summary) | Requirement(s) | Feature | Level | Planned test |
|---|---|---|---|---|---|
| AC-01 | Valid login: 200, HttpOnly SameSite=Lax cookie, body without password hash | FR-01 | F-01 | API | TEST-01 |
| AC-02 | Wrong password or unknown username: identical 401, no cookie | FR-01 | F-01 | API | TEST-02 |
| AC-03 | GET /me with valid cookie: 200; missing or garbage cookie: 401 | FR-01, NFR-01 | F-01 | API | TEST-03 |
| AC-04 | Logout: 204, session row deleted, old cookie then 401 | FR-01 | F-01 | API | TEST-04 |
| AC-05 | Expired session: 401 and row removed | FR-01 | F-01 | API | TEST-05 |
| AC-06 | Every protected endpoint without cookie: 401, body only {error} | NFR-01 | F-01 | API | TEST-06 |
| AC-07 | Stored password starts with $argon2id$ and is not the plaintext | NFR-02 | F-01 | Integration | TEST-07 |
| AC-08 | UI: anonymous redirect to /login, role-based landing, logout | FR-01 | F-01 | E2E-01 | TEST-08 |
| AC-09 | GET /api/queues returns code, name, isOpen, waitingCount | FR-02 | F-02 | API | TEST-09 |
| AC-10 | Join open queue D: 201, D001, WAITING, REGULAR, peopleAhead, row in DB | FR-02, FR-03, BR-01 | F-02 | API | TEST-10 |
| AC-11 | Second active join to same queue: 409 DUPLICATE_ACTIVE_ENTRY (TDD) | BR-02 | F-02 | API | TEST-11 |
| AC-12 | Same customer joins D and L at the same time: both 201 | BR-02 | F-02 | API | TEST-12 |
| AC-13 | Join closed queue: 409 QUEUE_CLOSED, no row, counter unchanged | BR-09 | F-02 | API | TEST-13 |
| AC-14 | 20 concurrent joins: seq 1..20, no duplicates | BR-01, NFR-03 | F-02 | API | TEST-14 |
| AC-15 | First entry of a Bangkok date is 001; next date restarts; queues independent | BR-01, BR-10 | F-02 | API + UT-02, UT-03 | TEST-15 |
| AC-16 | GET entry: own 200, other customer 404, operator 403 | FR-03 | F-02 | API | TEST-16 |
| AC-17 | Operator joining a queue: 403 FORBIDDEN | FR-02 | F-02 | API | TEST-17 |
| AC-18 | UI: join from /queues, /my-ticket shows number, status, people ahead, 5 s refresh, friendly duplicate message | FR-02, FR-03 | F-02 | E2E-02 | TEST-18 |
| AC-19 | GET operator/queues (assigned only, waiting counts) and current-entry | FR-13, BR-05 | F-03 | API | TEST-19 |
| AC-20 | Call-next: lowest-seq WAITING becomes CALLED with operator and called_at | FR-04, BR-03 | F-03 | API + UT-04 | TEST-20 |
| AC-21 | Call-next with nothing waiting: 409 NO_WAITING_ENTRY | FR-04 | F-03 | API | TEST-21 |
| AC-22 | Call-next while holding an entry: 409 OPERATOR_BUSY | BR-06 | F-03 | API | TEST-22 |
| AC-23 | teller1 call-next on queue L: 403 FORBIDDEN | BR-05 | F-03 | API | TEST-23 |
| AC-24 | Two operators call-next concurrently: different entries, or one gets 409 | BR-03, BR-07 | F-03 | API | TEST-24 |
| AC-25 | Start (CALLED to SERVING) and complete (SERVING to COMPLETED); customer sees status | FR-05 | F-03 | API | TEST-25 |
| AC-26 | Invalid transitions: 409 INVALID_TRANSITION, row unchanged (TDD) | BR-04 | F-03 | API + UT-01 | TEST-26 |
| AC-27 | Another operator starts or completes: 403 NOT_ENTRY_OWNER | BR-07 | F-03 | API | TEST-27 |
| AC-28 | Customer calls call-next, start or complete: 403 | FR-04, FR-05 | F-03 | API | TEST-28 |
| AC-29 | After restarting the API app against the same DB, COMPLETED is still returned | NFR-04 | F-03 | Integration | TEST-29 |
| AC-30 | UI: /operator shows queues, state-based actions, restores current entry after refresh | FR-04, FR-05, FR-13 | F-03 | E2E-02 | TEST-30 |

Unit tests support the AC as follows: UT-01 transition table (AC-26), UT-02 display number formatting (AC-15), UT-03 `queueDate()` at the Bangkok midnight boundary (AC-15), UT-04 `FifoOrderingPolicy` (AC-20). Rule work with test-first evidence (TDD): AC-11 (BR-02) and AC-26 (BR-04).

## 4. Coverage summary

| Measure | Count |
|---|---|
| Functional requirements (FR) | 13 |
| Business rules (BR) | 16 |
| Non-functional requirements (NFR) | 7 |
| Total requirements | 36 |
| Allocated to a feature | 36 (no requirement without a feature) |
| Allocated to Sprint 1 | 21 |
| Allocated to Sprint 2 | 10 |
| Allocated to Sprint 3 | 5 |
| Sprint 1 AC | 30 (AC-01 to AC-30) |
| Sprint 1 requirements with at least one AC | 19 of 21 |

## 5. Coverage gaps and approved changes

### 5.1 Coverage gaps (shown explicitly)

| Item | Gap | Handling |
|---|---|---|
| BR-08 (no financial or national-ID data) | No executable AC in Sprint 1 | Verified by inspection of the data model in migration 001 and the entry response shape (no such columns or fields). Recorded as a manual check in the Sprint 1 Definition of Done. A schema-whitelist test could be added if the team decides to; this would be recorded as an approved change with a new AC ID. |
| NFR-07 (no secrets in Git) | No executable AC in Sprint 1 | Manual review checklist at each release plus a repository search for secrets. The check and its result are recorded in the release evidence. |
| Sprint 2 and Sprint 3 requirements | No AC or test IDs yet | Intentional. IDs are created in the Sprint 2 contract (Issue #8) and Sprint 3 contract (Issue #13) before implementation. |

### 5.2 Approved changes

| Date | Change | Reason | Approved by |
|---|---|---|---|
| none | No scope changes since baseline v1.0 | | |

Future changes (for example D-22, optional `counterId` as F-03 contract v2) are recorded here with date, reason and the affected requirement, feature, AC and tests.

## 6. Sprint 1 test files

The file names below are the ones on `sprint-1-staging` after F-01, F-02 and F-03. The result column of Part F is produced by `npm run evidence` and is not stored in this document.

| AC | TEST | File |
|---|---|---|
| AC-01..AC-07 | TEST-01..TEST-07 | `apps/api/test/integration/f01-auth.spec.ts` |
| AC-08 | TEST-08 | `apps/web/e2e/auth.spec.ts` |
| AC-09..AC-17 | TEST-09..TEST-17 | `apps/api/test/integration/f02-join-queue.spec.ts` |
| AC-15 | UT-02 | `apps/api/test/unit/display-number.spec.ts` |
| AC-15 | UT-03 | `apps/api/test/unit/queue-date.spec.ts` |
| AC-18 | TEST-18 | `apps/web/e2e/sprint1-journey.spec.ts` |
| AC-19..AC-29 | TEST-19..TEST-29 | `apps/api/test/integration/f03-service-desk.spec.ts` |
| AC-20 | UT-04 | `apps/api/test/unit/fifo-ordering-policy.spec.ts` |
| AC-26 | UT-01 | `apps/api/test/unit/entry-status.spec.ts` |
| AC-30 | TEST-30 | `apps/web/e2e/sprint1-journey.spec.ts` |

TDD logs already committed with the feature PRs: `docs/sprints/sprint-1/evidence/TEST-11-red.txt`, `TEST-11-green.txt`, `TEST-26-red.txt`, `TEST-26-green.txt`.
