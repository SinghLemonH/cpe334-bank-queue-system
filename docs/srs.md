# Software Requirements Specification: Bank Branch Queue System

| | |
|---|---|
| **Course** | CPE 334 Introduction to Software Engineering in the Age of AI Agents, Semester 1/2026 |
| **Theme** | 9 Queue and Service Management System |
| **Context** | Bank Branch Queue System |
| **Team** | Wichitchai Suwanno (67070503439), Wathit Tritsananawakit (67070503495) |
| **Document version** | 1.0 (5 Nov 2026), baseline for Project Deliverable 1 |
| **Related documents** | `docs/features.md`, `docs/traceability.md`, `docs/system-sds.md`, `docs/sprints/plan.md` |

Requirement IDs (FR, BR, NFR), decision IDs (D-), and question IDs (Q-) are stable. They are never renumbered or reused. Items still waiting for instructor or TA confirmation are marked **Open** in section 11. Everything else is decided.

---

## 1. Introduction

### 1.1 Stakeholder problem

A bank branch serves walk-in customers who need different services (cash counters, loan advice, opening an account). Without a managed waiting line, customers cannot tell who is next or how long they may wait, staff have no shared record of who has been called or served, and two staff members can call the same person. Customers who are elderly or less mobile are not treated consistently.

The branch needs a waiting-line system with these properties:

1. Every customer gets a unique, ordered queue number for the service they need.
2. Staff call the next customer in a fair, predictable order and cannot accidentally serve the same customer twice.
3. Customers can see their own status and how many people are ahead of them.
4. The branch can later apply a priority rule for senior customers and see simple service summaries.

### 1.2 Chosen context

**Bank Branch Queue System.** A single branch has three service queues:

| Code | Service | Operators (seeded) |
|---|---|---|
| D | Deposit & Withdrawal | teller1, teller2 |
| L | Loans | loanofficer1 |
| O | Account Opening | accountofficer1 |

The system manages **only the waiting line**. It never processes deposits, withdrawals, loans, KYC or any money movement.

### 1.3 Purpose of this document

This SRS defines actors, scope, functional requirements (FR), business rules (BR), non-functional requirements (NFR), assumptions, decisions and open questions for the whole product (Sprints 1 to 3). Feature allocation is in `docs/features.md`; requirement-to-test traceability is in `docs/traceability.md`.

---

## 2. Actors and responsibilities

| Actor | Role value in code | Who they are | Responsibilities in the system |
|---|---|---|---|
| **Customer** | `CUSTOMER` | A walk-in bank customer (seeded demo account) | Joins a queue, views their own ticket and status, cancels their own entry (Sprint 2). Can never call, serve or complete entries. |
| **Operator** | `OPERATOR` | Bank staff: teller, loan officer, account officer (seeded demo accounts) | Calls the next customer, starts and completes service, marks no-show, opens or closes the queue and runs end-of-day (Sprint 2), views the service summary (Sprint 3). Acts **only** on queues assigned to them and, for per-entry actions, **only** on entries they called. |
| **Anonymous viewer** | none (not logged in) | Anyone in the branch looking at the public display | Reads the public board (Sprint 2): display numbers, counter labels and waiting counts. Sees no personal data. |

Accounts have exactly one role. Seeded demo accounts are sufficient; there is no self-registration (see section 3.2).

---

## 3. Scope

### 3.1 In scope

1. Authentication (login, logout, current user) and server-side role enforcement for Customer and Operator.
2. Joining a service queue and receiving a unique daily display number.
3. Viewing own ticket status and the number of people ahead.
4. Calling, starting and completing service, with strict state transitions and operator ownership of entries.
5. Cancel, no-show, end-of-day expiry, queue open/close, named counters and a public board (Sprint 2).
6. Priority lane for senior customers and a per-queue service summary (Sprint 3).
7. Persistent storage, migrations and reproducible synthetic seed data.

### 3.2 Explicit exclusions

| Excluded | Reason |
|---|---|
| Advance appointment booking | The theme defines the waiting line as the core workflow (D-10). |
| SMS, LINE or e-mail notifications | No external messaging service is required (D-10). |
| Real banking, payment, deposits, loans, KYC | The system manages the line only (D-10, D-11). |
| Storing account numbers, balances, amounts or national ID numbers | Not needed by any queue rule (D-11, BR-08). |
| Self-registration, password recovery, e-mail verification, account administration | Not required by the course; seeded accounts are enough (D-10). |
| Multi-role accounts | One role per account (D-10). |
| Multiple branches | One branch only. |
| Real-time push (WebSocket, SSE) | The UI refreshes by polling every 5 seconds (assumption A-07). |
| Kiosk or ticket-printer hardware | Customers take a number through the web UI. |

---

## 4. Glossary

| Term | Meaning |
|---|---|
| Queue | A waiting line for one service type, identified by a one-letter code (`D`, `L`, `O`). |
| Entry (ticket) | One customer's place in one queue on one date. |
| Display number | Queue code plus sequence padded to 3 digits, for example `D001`. Sequences above 999 show 4 or more digits (`D1000`). |
| Queue date | The calendar date in `Asia/Bangkok` on which an entry joined. Numbering restarts at `001` each queue date. |
| Active entry | An entry in status WAITING, CALLED or SERVING. |
| Terminal status | COMPLETED, CANCELLED, NO_SHOW or EXPIRED. |
| Lane | REGULAR or PRIORITY. Every entry has a lane; only REGULAR is used before Sprint 3. |
| Counter | A named service point (for example "Counter 1") used by an operator in Sprint 2. |
| People ahead | For a WAITING entry in Sprint 1: the number of WAITING entries in the same queue and queue date with a lower sequence (see A-06). |

---

## 5. Functional requirements

| ID | Actor | Requirement (observable behavior) | Sprint |
|---|---|---|---|
| FR-01 | Any user | A user logs in with username and password and receives a session. The user can retrieve their current identity (id, username, display name, role) and log out, after which the old session is rejected. | 1 |
| FR-02 | Customer | A customer lists the service queues (code, name, open or closed, waiting count) and joins an open queue. The response contains the display number, status WAITING, lane and people ahead. | 1 |
| FR-03 | Customer | A customer views their own entries for today with status and people ahead. Another customer's entry is never visible. | 1 |
| FR-04 | Operator | An operator calls the next eligible entry in an assigned queue. That entry becomes CALLED and is recorded against the operator. | 1 |
| FR-05 | Operator | The operator who called an entry starts service (CALLED to SERVING) and completes it (SERVING to COMPLETED). The customer then sees the new status. | 1 |
| FR-13 | Operator | An operator views their assigned queues with waiting counts and the entry they currently hold, so a page refresh does not lose the entry being served. | 1 |
| FR-06 | Customer | A customer cancels their own WAITING or CALLED entry. | 2 |
| FR-07 | Operator | An operator marks an entry they called as NO_SHOW. | 2 |
| FR-08 | Anyone | A public board shows now-serving display numbers with counter labels and waiting counts per queue, without personal data. | 2 |
| FR-09 | Operator | An operator serves from a named counter; a called entry records the counter and the counter label is shown on the board. | 2 |
| FR-12 | Operator | An operator opens or closes an assigned queue and runs end-of-day, which expires the day's leftover WAITING and CALLED entries. | 2 |
| FR-10 | Customer, Operator | A senior customer is served through a priority lane. Eligibility is decided by the server. | 3 |
| FR-11 | Operator | An operator views a service summary per queue and date range: served count, average wait, average service time, no-show count and cancel count. | 3 |

IDs are grouped by sprint, so numbering is not sequential in the table. Allocation to features is in `docs/features.md`.

---

## 6. Business rules

| ID | Rule | Enforced by | Sprint |
|---|---|---|---|
| BR-01 | Display numbers are unique per queue per day, even under concurrent joins. | DB unique constraint `uq_entry_number`; atomic daily counter | 1 |
| BR-02 | **(v2, Lab 7 CR-01)** A customer has at most one active (WAITING, CALLED, SERVING) entry per day **across all queues**. *(v1: at most one per queue per day; a customer may hold active entries in different queues at the same time.)* | Per-customer advisory lock + service pre-check; partial unique index `uq_active_entry_per_customer` (per queue) | 1 (changed in Lab 7) |
| BR-03 | Call-next selects the WAITING entry with the lowest sequence in the queue for today (FIFO in Sprint 1). | Ordering policy plus ordered query | 1 |
| BR-04 | Only transitions in the state machine (D-04) are allowed. A rejected transition changes no data. | Domain transition table; conditional update | 1 |
| BR-05 | Operators act only on queues assigned to them. | Service check against `operator_queue_assignment` | 1 |
| BR-06 | An operator holds at most one CALLED or SERVING entry per day. | Service check; partial unique index `uq_operator_active_entry` | 1 |
| BR-07 | Only the operator who called an entry may start, complete or no-show it. Two operators never receive the same entry. | Service ownership check; row locking with `SKIP LOCKED` | 1 |
| BR-08 | Queue records contain no financial data and no national ID data. | Schema design (D-11) | 1 |
| BR-09 | A closed queue rejects new joins; entries already in it can still be served. | Join transaction check | 1 |
| BR-10 | Numbering restarts at `001` per queue at `Asia/Bangkok` midnight. | `queue_date` computed from the injected Clock (D-06, D-20) | 1 |
| BR-11 | A customer may cancel only their own WAITING or CALLED entry. | Domain transition table; ownership check | 2 |
| BR-12 | No-show may be marked only for a CALLED entry at least 2 minutes after it was called (grace period, configurable; see Q-02). | Domain rule using the Clock | 2 |
| BR-13 | A counter has at most one CALLED or SERVING entry at a time. | Partial unique index `uq_counter_active_entry` | 2 |
| BR-16 | End-of-day closes the queue and sets remaining WAITING and CALLED entries of that day to EXPIRED. | Service transaction | 2 |
| BR-14 | PRIORITY entries are called before REGULAR ones, FIFO within each lane. After 3 consecutive PRIORITY calls (see Q-01), a waiting REGULAR entry is called. | `PriorityOrderingPolicy`; queue row lock | 3 |
| BR-15 | Priority eligibility (age 60 or more on the join date, see Q-01) is computed only on the server from the stored date of birth. No client field can set the lane. | Server-side computation at join; DTO rejects unknown fields | 3 |

---

## 7. Non-functional requirements

| ID | Requirement (measurable) | Verification method | Sprint |
|---|---|---|---|
| NFR-01 | Every protected endpoint returns 401 and no private data when the request has no valid session. | Table-driven API test over all protected endpoints (TEST-06) | 1 |
| NFR-02 | Passwords are stored only as argon2id hashes; the stored value starts with `$argon2id$` and never equals the plaintext. | Integration test reading the stored hash (TEST-07) | 1 |
| NFR-03 | 20 concurrent joins to one queue produce 20 distinct sequence numbers (1 to 20) with no duplicates and no errors. | API test with 20 parallel real HTTP requests (TEST-14) | 1 |
| NFR-04 | Data survives an API restart (Sprint 1, local) and a redeployment (Lab 5 and Sprint 2, on GCP). | Restart test (TEST-29) plus deployment persistence check | 1, 2 |
| NFR-05 | Public board responses contain no names, usernames or customer IDs. | API test asserting the exact set of response keys | 2 |
| NFR-06 | The 95th percentile join latency is under 500 ms over 50 sequential joins in the local environment. | Measurement script with saved output | 3 |
| NFR-07 | No secrets are committed to Git; all configuration comes from environment variables documented in `.env.example`. | Review checklist item in the Definition of Done plus repository search for secrets (manual) | 1 |

---

## 8. Data handling, security and privacy

1. **Synthetic data only.** All users, dates of birth and queue entries are invented. No real customer data is used anywhere (tests, seed, screenshots).
2. **No financial data (D-11, BR-08).** An entry holds only: queue, customer, lane, status, operator, counter (Sprint 2) and timestamps.
3. **Date of birth (D-12).** Customers have a synthetic `date_of_birth` so that priority eligibility can be computed server-side in Sprint 3. It is stored only on the user record, is never returned by the API (the current-user response is `{id, username, displayName, role}`) and never appears on the public board. Whether storing a synthetic date of birth is acceptable is recorded as Q-03.
4. **Credentials.** Passwords are hashed with argon2id. Login failures return the same 401 response whether or not the username exists (no account enumeration).
5. **Authorization.** Enforced on the backend for every request. The client never supplies user id, role or lane. A hidden button is not authorization.
6. **Secrets.** Demo passwords and connection strings are read from environment variables; only `.env.example` (without real values) is committed.

---

## 9. Assumptions

| ID | Assumption |
|---|---|
| A-01 | One branch, one time zone (`Asia/Bangkok`). |
| A-02 | Customers identify themselves with seeded demo accounts. Taking a number at a kiosk or by showing a physical ID is not modeled. |
| A-03 | Seeded demo accounts are enough; account creation is out of scope. |
| A-04 | An operator serves one customer at a time (BR-06). |
| A-05 | The server clock is trusted. All "now" values come from one injectable Clock (D-20). |
| A-06 | In Sprint 1, people ahead = number of WAITING entries in the same queue and queue date with a lower sequence. The Sprint 3 contract revises this definition when the priority lane changes call order. |
| A-07 | Status updates reach the customer by polling every 5 seconds; no push channel. |
| A-08 | Entries left unfinished on an earlier day never block a customer or operator today (D-13). Sprint 1 does not expire them; end-of-day expiry arrives in Sprint 2. |
| A-09 | `GET /api/me/entries` returns today's entries only. |

---

## 10. Decision log

| ID | Category | Decision | Reason or impact |
|---|---|---|---|
| D-01 | Product | Sprint 1 ordering is FIFO by `seq` within one queue per day. Display number is queue code plus sequence padded to 3 digits. | Simple, deterministic ordering (BR-03). |
| D-02 | Product | One queue per service type: D, L, O. Operators act only on queues in `operator_queue_assignment`. Several operators may share a queue. | Models branch service desks (BR-05). |
| D-03 | Product | **(v2)** At most 1 active entry per customer per day across all queues. *(v1: per queue; different queues at once allowed.)* | v2 reason: tickets in two queues at once are called at two counters together and one counter waits for a no-show (Lab 7 CR-01). |
| D-04 | Product | State machine. Sprint 1: WAITING, CALLED, SERVING, COMPLETED. Sprint 2 adds WAITING/CALLED to CANCELLED (customer), CALLED to NO_SHOW (operator), WAITING/CALLED to EXPIRED (end of day). | Defines BR-04 completely. |
| D-05 | Product | An operator holds at most 1 CALLED/SERVING entry per day. Call-next is rejected while one is outstanding. | BR-06. |
| D-06 | Product | `queue_date` is computed in the application in `Asia/Bangkok`. | Numbering resets at branch-local midnight regardless of server time zone (BR-10). |
| D-07 | Security | Another customer's entry returns 404; a wrong role returns 403. | Does not reveal whether an entry id exists. |
| D-08 | Product | Joining a closed queue returns 409 `QUEUE_CLOSED`. Entries already in the queue can still be served. | BR-09. |
| D-09 | Product | The public board (Sprint 2) shows only display numbers, counter labels and waiting counts, never names. | NFR-05. |
| D-10 | Scope | Out of scope: advance booking, SMS/LINE notifications, real banking or payment, KYC, multi-role accounts, self-registration. | Section 3.2. |
| D-11 | Privacy | No financial data is stored. An entry holds only queue, customer, lane, status, operator, counter and timestamps. | BR-08. |
| D-12 | Privacy | Customers have a synthetic `date_of_birth`. Priority eligibility is computed server-side; clients cannot claim priority. | BR-15. |
| D-13 | Product | Active-entry uniqueness is scoped by `queue_date`. Unfinished entries from earlier days never block anyone today. In Sprint 2, end-of-day sets leftovers to EXPIRED. | Avoids stuck customers and operators; BR-16. |
| D-14 | Product | Only the operator who called an entry may start, complete or no-show it. Another operator on the same queue gets 403 `NOT_ENTRY_OWNER`. | BR-07. |
| D-15 | Architecture | Migration 001 already contains every status value and the `lane` column (default REGULAR). Sprint 1 code uses only Sprint 1 transitions and REGULAR. | Avoids schema churn; later sprints add behavior, not columns (except `counters` in Sprint 2). |
| D-16 | Architecture | API paths identify queues by code (`/api/queues/D/...`). Users, entries and sessions use UUIDs. | Readable queue URLs; non-enumerable record ids. |
| D-17 | Product | A customer cancels their own WAITING or CALLED entry. Operators do not cancel; they mark no-show. | BR-11, BR-12. |
| D-18 | Architecture | The browser calls same-origin `/api/*`. A Next.js Route Handler forwards to NestJS using `API_BASE_URL` read at runtime. `next.config` rewrites are not used. | Rewrites are frozen at build time in Docker standalone builds. |
| D-19 | Delivery | Deliverable 1 runs on local Docker PostgreSQL only. Supabase (as plain PostgreSQL) is introduced in Lab 5. | Matches the course schedule. |
| D-20 | Architecture | All "now" values come from an injectable `Clock` provider. Timestamps are set explicitly by the application; DB `DEFAULT now()` is only a safety net and tests never rely on it. | Makes daily reset, age boundary, no-show grace and session expiry testable. |
| D-21 | Product | The operator UI recovers state from `GET /api/operator/current-entry`. | A page refresh never loses the entry being served (FR-13). |
| D-22 | Product | In Sprint 2, `counterId` on call-next is optional. If omitted, no counter is recorded and BR-13 is not applied; the UI always sends it. | Keeps every Sprint 1 test valid. To be recorded as F-03 contract v2. |
| D-23 | Process | Feature and release PRs are merged with merge commits only (no squash, no rebase). | Keeps red-test and green-implementation commits as TDD evidence. |
| D-24 | Process | Lab work (Lab 5, Lab 6 fixes, Lab 7 change) reaches `main` through patch releases (`v0.1.1`, `v0.1.2`, `v0.2.1`) cut from the current sprint staging branch, following the normal PR flow. | The pipeline deploys only from `main`. Requires sprint staging to stay releasable. |

---

## 11. Open questions and their resolution

Working defaults are used until the question is answered. Answers will be recorded here with the date and a new decision ID.

| ID | Category | Question | Working default | Status |
|---|---|---|---|---|
| Q-01 | Product | Are the priority age (60) and the anti-starvation limit (3 consecutive priority calls) acceptable? Are other priority groups (disabled, pregnant customers) in scope? | Age 60 or more and limit 3; seniors only. | Open (ask TA) |
| Q-02 | Product | Is a 2-minute grace period before no-show acceptable? | 2 minutes, configurable (`NO_SHOW_GRACE_MINUTES`). | Open (ask TA) |
| Q-03 | Privacy | Is storing a synthetic `date_of_birth` acceptable? | Yes, with the privacy handling in section 8. | Open (ask TA) |
| Q-04 | Delivery | Is an external Supabase PostgreSQL acceptable for the Lab 5 GCP deployment, or must Cloud SQL be used? | Supabase session pooler; Cloud SQL as fallback. | Open (ask TA) |
| Q-05 | Process | Final demo video length: 4 minutes (Final handout) or 10 minutes (group specification)? | Aim for 4 minutes or less. | Open (ask TA) |
| Q-06 | Delivery | Exact PostgreSQL major version of the Supabase project, to match docker-compose. | PostgreSQL 17 locally. | Open (check in Lab 5) |
| Q-07 | Delivery | Node.js major version for both machines. | Node 24 LTS (`.nvmrc`); Node 22 also accepted by `engines`. | Open (confirm when scaffolding) |
| Q-08 | Process | Repository visibility (public, or private with TA collaborators) and availability of branch protection. | Decide before Lab 5. | Open |
| Q-09 | Process | What must the Lab 6 partner team be able to access on 10 and 12 Nov? This decides whether the Lab 5 deployment must finish by 11 Nov. | Deploy by Wed 11 Nov; fallback is a documented local run of the Sprint 1 tag. | Open (check Lab 6 handout) |
| Q-10 | Process | Lab 5, 6 and 7 details (part numbers, the Lab 7 rule on changing implemented behavior) come from handouts not yet reviewed. | Verify against the handouts when issued. | Open |

---

## 12. Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 5 Nov 2026 | Initial baseline for Deliverable 1. No approved scope changes yet. |
| 1.1 | 26 Nov 2026 | Lab 7 CR-01: BR-02 and D-03 changed from one active entry per queue to one per customer per day across all queues. |
