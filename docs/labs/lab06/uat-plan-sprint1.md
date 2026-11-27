# Lab 6 Part A: Sprint 1 UAT Plan and Handoff

Product: **Bank Branch Queue System**. Product Team: SinghLemonH (Student A) and WATHITx (Student B).
UAT Team: `<partner team name, students and IDs>`.
Plan version: v1, 2026-11-18. Status: **DRAFT**. Fill every `<...>` before you send it.

---

## 1. Release under test

| Item | Value |
|---|---|
| Repository | https://github.com/SinghLemonH/cpe334-bank-queue-system |
| Sprint 1 baseline release | Release PR #22 (`sprint-1-staging` -> `main`). Merge commit `0a2d8fedc050db29bd96991e66d24187fc32812d` (2026-11-07). Planned tag `v0.1.0-sprint1`: **it is not on the remote yet. Push it or change this row.** |
| Deployed commit | `e6fdff0ce57bcb2792e2700421ba05a9485d122e`: `main`, merge of PR #36 (`Lab5-staging` -> `main`), deployed 2026-11-19. `/api/version` returns `{"version":"0.2.0-lab5","commit":"e6fdff0…"}`. Images in Artifact Registry are tagged with the same SHA. |
| Deployed Cloud Run revisions | `queue-web`: `<revision name>`. `queue-api`: `<revision name>`. |
| Deploy run | GitHub Actions `Deploy demo` run #2, triggered by WATHITx's push of `e6fdff0` to `main`. **Success** in 9 min 47 s: `test / test-and-docker` took 5 min 38 s and `deploy` took 3 min 59 s, including the smoke test that requires `/api/version` = `e6fdff0`. The run summary shows Deployed Commit SHA `e6fdff0ce57bcb2792e2700421ba05a9485d122e` and Is Rollback `false`. |
| URL to test | https://queue-web-5dckavoyda-as.a.run.app |
| Find the running commit | Footer on every page, or `https://queue-web-5dckavoyda-as.a.run.app/api/version` |
| Contents of the deployed release | Sprint 1 features F-01, F-02 and F-03, plus Lab 5 changes that do not change behaviour: Docker, CI/CD, `/api/health`, `/api/ready`, `/api/version` and the version footer. No Sprint 2 or Sprint 3 feature is deployed. |

**Deployment freeze.** The Product Team does not deploy again until UAT is finished. If a redeploy is needed, the Product Team tells the UAT Team before deploying (Lab 6, section 2). Acceptance applies only to the release recorded here.

**Version history.** Before 2026-11-19 the deployment ran the older image `e69364e…`, because the `Deploy demo` workflow for `7e57812` failed: two actions were pinned to commit SHAs that do not exist. PR #35 fixed the pins, and PR #36 released `main` `e6fdff0`.

`e6fdff0` differs from the Sprint 1 baseline `0a2d8fe` only in Lab 5 work:

- Docker and CI/CD
- `/api/health`, `/api/ready` and `/api/version`
- The version footer
- Database connection settings in `data-source.ts`: SSL and pool size

`git diff --stat 0a2d8fe e6fdff0 -- apps/*/src` shows 7 files, all infrastructure. No F-01..F-03 controller, service or page changed, so the Sprint 1 contract is unchanged.

## 2. Accepted-for-test scope (Sprint 1 contract)

| Feature | Requirements | Acceptance criteria | Covered by these UAT cases |
|---|---|---|---|
| F-01 Login and role-based access | FR-01, NFR-01 | AC-01..AC-04, AC-06, AC-08 | UAT-01, UAT-07 |
| F-02 Join queue and my ticket | FR-02, FR-03, BR-01, BR-02, BR-08 | AC-09..AC-12, AC-16..AC-18 | UAT-02, UAT-03, UAT-04, UAT-05 |
| F-03 Operator service desk | FR-04, FR-05, FR-13, BR-03..BR-05, BR-07 | AC-19..AC-21, AC-23, AC-25, AC-27, AC-28, AC-30 | UAT-02, UAT-04, UAT-05, UAT-06 |

**In Sprint 1 scope, but not testable by hand on the shared deployment.** The automated suite covers these. They are not part of manual UAT, and testers should not report them as BLOCKED.

| AC | Why it is not manual UAT | Automated test |
|---|---|---|
| AC-05 Session expiry after 8 h | Needs a fixed clock | TEST-05 |
| AC-07 argon2id hash | Needs database access | TEST-07 |
| AC-13 Closed queue rejects a join | Sprint 1 has no screen to close a queue. Every seeded queue is open. | TEST-13 |
| AC-14 Twenty concurrent joins | Needs parallel requests | TEST-14 |
| AC-15 Numbers restart at Bangkok midnight | Needs a fixed clock | TEST-15, UT-02, UT-03 |
| AC-22 Operator busy | The UI disables "Call next" while the operator holds an entry | TEST-22 |
| AC-24 Two tellers call at the same instant | Needs concurrency | TEST-24 |
| AC-26 Invalid state transitions | The UI shows only valid buttons | TEST-26, UT-01 |
| AC-29 Data survives an API restart | Needs a restart of the service | TEST-29 (UAT-06 checks persistence across sessions) |

**Out of scope. Do not report these as defects.** They are planned for Sprint 2 or Sprint 3 (`docs/known-limitations.md`):

- Customer cancel, operator no-show and end-of-day expiry
- Counters, the public board and the priority lane (every ticket is `REGULAR` and served in FIFO order)
- Realtime updates. Status refreshes by polling every 5 seconds.
- A CSRF token
- An administrator role. The system has none.

Report a mismatch between the app and an expected result in this plan as a finding. Report a request for new behaviour as an enhancement.

## 3. Accounts and roles

The Product Team sends passwords **privately** through `<channel, for example a direct LINE message or the private LEB2 handoff>`. Every account uses the same synthetic password (`SEED_DEMO_PASSWORD`). No password appears in this document or in Git.

| Account label | Role | Assigned queue | Used in |
|---|---|---|---|
| `customer1` (Somchai) | CUSTOMER | – | UAT-01, -02, -03, -05, -06, -07 |
| `customer2` (Somsak) | CUSTOMER | – | UAT-04, UAT-05 |
| `customer3` (Wichai) | CUSTOMER | – | UAT-04 |
| `teller1` | OPERATOR | D (Deposit & Withdrawal) | UAT-01, -02, -04, -05, -06 |
| `teller2` | OPERATOR | D | UAT-05 |
| `loanofficer1` | OPERATOR | L (Loans) | UAT-05 |

Seeded queues: `D` Deposit & Withdrawal, `L` Loans, `O` Account Opening. All three are open.

Display numbers have the form queue code + 3-digit sequence, for example `D007`. The sequence restarts at `001` each day at midnight Asia/Bangkok.

Data rules:

- All data is synthetic.
- Entries contain no financial or ID data (BR-08).
- Do not type real names or personal data anywhere.

## 4. Setup, sequence and cleanup

**Sequence.** Run the cases in order, UAT-01 to UAT-07, in one session on one day.

- UAT-02 to UAT-06 depend on **S0** below.
- UAT-03 runs after UAT-02, because customer1's D ticket is COMPLETED by then.
- UAT-06 builds its own data.

Use **two browser profiles**, or one normal window and one private window. This keeps the customer and operator sessions apart: one browser holds one session cookie.

**S0: reset before UAT-02 (empty queues D and L)**

There is no reset button. A queue is empty when no entry is WAITING, CALLED or SERVING.

1. Log in as `teller1`. Open `/operator`.
2. If a "Current customer" card is shown, press **Start** if it is shown, then **Complete**.
3. Press **Call next** on queue D, then **Start**, then **Complete**. Repeat until the message "No customers are waiting in this queue." appears.
4. Do the same as `teller2` for queue D, and as `loanofficer1` for queue L.
5. Record the waiting count of D and L on `/queues`. Both must show **0**.

**Cleanup after the session.** Run S0 again, so no WAITING, CALLED or SERVING entry is left behind. Completed entries stay as history. That is intended.

**Constraint on the shared deployment.** The Product Team does not use the deployment during the agreed UAT window: `<date, time>`. If an unexpected entry appears, record it, run S0 and repeat the case.

---

## 5. UAT cases

Record each result as **PASS**, **FAIL** or **BLOCKED (reason)**. Write what you actually saw. Do not copy the expected result.

Notes for testers:

- `<n>` stands for the sequence number observed in the step where it first appears.
- "Waiting count" means the number shown for that queue on `/queues`.
- Time out a status wait after **10 seconds**. Polling runs every 5 seconds.

### UAT-01: Login, role routing and invalid credentials

| Field | Value |
|---|---|
| Category | Access (authentication) |
| Reference | FR-01; AC-01, AC-02, AC-03, AC-04, AC-08 |
| Purpose | Each role lands on its own page. Wrong credentials are rejected without revealing which part was wrong. |
| Role(s) | customer1, teller1, anonymous |
| Preconditions | Logged out. Browser on the URL under test. |
| Inputs | (a) username `customer1`, password `wrong-pass-123`; (b) username `nobody99`, password `wrong-pass-123`; (c) `customer1` with the real password; (d) `teller1` with the real password |

| Step | Action | Expected result |
|---|---|---|
| 1 | Open `/queues` directly while logged out | Browser goes to `/login` |
| 2 | Log in with input (a) | Message "Invalid username or password." You stay on `/login`. |
| 3 | Log in with input (b) | **The same** message as step 2, word for word. You stay on `/login`. |
| 4 | Log in with input (c) | You land on `/queues`. The header shows the display name "Somchai (Senior)" and role CUSTOMER. |
| 5 | Open `/api/auth/me` in the same tab | JSON with `id`, `username: "customer1"`, `displayName` and `role: "CUSTOMER"`. No password or hash field. |
| 6 | Press **Logout** | You return to `/login`. |
| 7 | Log in with input (d) | You land on `/operator`. The header shows role OPERATOR. |
| 8 | Logout | You return to `/login`. |

### UAT-02: Normal journey, from join to completed service

| Field | Value |
|---|---|
| Category | **Normal domain journey** |
| Reference | FR-02, FR-03, FR-04, FR-05; AC-09, AC-10, AC-18, AC-19, AC-20, AC-25, AC-30; BR-03, BR-08 |
| Purpose | A customer gets a ticket and an operator serves it to the end. Both sides see each status change. |
| Role(s) | customer1 (browser A), teller1 (browser B) |
| Preconditions | S0 done. The D waiting count is 0. Neither account holds an active entry. |
| Inputs | Queue `D` |

| Step | Action | Expected result |
|---|---|---|
| 1 | A: log in as customer1 and open `/queues` | Queues D, L and O are listed. Each shows "Open" and a waiting count. D shows **0**. |
| 2 | A: press **Join** on D | You are redirected to `/my-ticket`. The ticket shows number **D`<n>`** (3 digits), status **Waiting** and people ahead **0**. The ticket shows no financial data and no ID data. |
| 3 | A: go back to `/queues` | The D waiting count is now **1** (0 + 1). |
| 4 | B: log in as teller1 and open `/operator` | "Assigned queues" lists **D only**, with waiting count **1**. No "Current customer" card is shown. |
| 5 | B: press **Call next** on D | The "Current customer" card shows **D`<n>`** (the same number as step 2), status **Called** and "Called at" with a time. The D waiting count becomes **0**. |
| 6 | A: wait up to 10 s on `/my-ticket` | Status changes to **Called**. |
| 7 | B: press **Start** | Status becomes **Being served**. "Started at" is shown. The Start button disappears. |
| 8 | A: wait up to 10 s | Status changes to **Being served** (SERVING). |
| 9 | B: press **Complete** | The "Current customer" card goes away. **Call next** is enabled again. |
| 10 | A: wait up to 10 s | Status changes to **Completed**. |

### UAT-03: Business rule, one active ticket per queue per day

| Field | Value |
|---|---|
| Category | **Business rule / boundary** |
| Reference | BR-02; AC-11, AC-12; TEST-12 (extra) |
| Purpose | A customer cannot hold two active tickets in the same queue. A customer may hold tickets in different queues. A customer may join again after the first ticket is completed. |
| Role(s) | customer1 |
| Preconditions | UAT-02 finished: customer1's D ticket from today is COMPLETED. L waiting count is 0. |
| Inputs | Queues `D` and `L` |

| Step | Action | Expected result |
|---|---|---|
| 1 | Log in as customer1 and open `/queues`. Note the D waiting count as `w`. | – |
| 2 | Press **Join** on D | **Accepted** (boundary: the earlier ticket is COMPLETED, so it is no longer active). The new ticket number is **D`<n+1>`**, one higher than the UAT-02 number, with status Waiting. |
| 3 | Return to `/queues` and press **Join** on D again | **Rejected.** Message "You already have an active ticket in this queue today." The D waiting count stays **w + 1**. It does not become w + 2. |
| 4 | Open `/my-ticket` | Exactly **one** active D ticket is shown (D`<n+1>`). No second D ticket was created. |
| 5 | Return to `/queues` and press **Join** on L | Accepted. A ticket **L`<m>`** is shown with status Waiting. customer1 now holds one active ticket in D and one in L. |
| 6 | Cleanup: run S0 for D and L | Both waiting counts are 0. |

### UAT-04: FIFO order and "people ahead"

| Field | Value |
|---|---|
| Category | Business rule (supporting case) |
| Reference | BR-03, BR-01; AC-16 (`peopleAhead`), AC-20, AC-21 |
| Purpose | The people-ahead count is correct. Call next serves the oldest waiting ticket. Calling an empty queue is rejected. |
| Role(s) | customer2, customer3, teller1 |
| Preconditions | S0 done. The D waiting count is 0. |
| Inputs | Queue `D` |

| Step | Action | Expected result |
|---|---|---|
| 1 | customer2 joins D | Ticket D`<a>` with people ahead **0** |
| 2 | customer3 joins D (other browser) | Ticket D`<a+1>` with people ahead **1** |
| 3 | teller1 presses **Call next** on D | The card shows **D`<a>`** (customer2's ticket, the lowest number). It does **not** show D`<a+1>`. |
| 4 | customer3 waits up to 10 s on `/my-ticket` | People ahead becomes **0**. Status is still Waiting. |
| 5 | teller1 presses Start and Complete, then **Call next** | The card shows D`<a+1>`. |
| 6 | teller1 presses Start and Complete, then **Call next** again | Message "No customers are waiting in this queue." No card appears. |

### UAT-05: Forbidden role and ownership

| Field | Value |
|---|---|
| Category | **Forbidden role / ownership** |
| Reference | BR-05, BR-07, FR-03; AC-16, AC-17, AC-19, AC-23, AC-27, AC-28, NFR-01 |
| Purpose | Each role and each account can only see and change what it owns. Every rejected action leaves the data unchanged. |
| Role(s) | customer1, customer2, teller1, teller2, loanofficer1 |
| Preconditions | S0 done. Two browsers. |
| Inputs | Entry IDs that you read from `/api/me/entries` |

| Step | Action | Expected result |
|---|---|---|
| 1 | customer2 joins D. Then, in the same tab, open `/api/me/entries` and copy the `id` of the D entry (`<id2>`). | JSON with only customer2's entries for today |
| 2 | In browser B, log in as customer1 and open `/api/entries/<id2>` | **404**, body `{"error":{"code":"NOT_FOUND",...}}`. The body contains no ticket number, status or other data from customer2's entry. |
| 3 | customer1 opens `/api/me/entries` | Only customer1's own entries are listed. customer2's entry does not appear. |
| 4 | customer1 opens `/operator` | The page shows "You are not allowed to do this." / "คุณไม่มีสิทธิ์ทำรายการนี้" and a **Retry** button. No assigned queues, no Call next button and no current customer are shown. |
| 5 | Logout. In browser B, log in as teller1 and open `/queues`. Press **Join** on D. | Message "Only customers can join a queue." The D waiting count does not change. |
| 6 | teller1 opens `/operator` and presses **Call next** on D | teller1 holds customer2's ticket (status Called) |
| 7 | In browser A, log out and log in as **teller2**. Open `/operator`. | No current customer is shown for teller2. teller1's ticket is not shown as held by teller2. |
| 8 | teller2 opens the developer console (F12) and runs `fetch('/api/entries/<id2>/start',{method:'POST'}).then(r=>r.json().then(b=>console.log(r.status,b)))` | Prints **403** `NOT_ENTRY_OWNER` |
| 9 | Back in browser B, teller1 refreshes `/operator` | customer2's ticket is still **Called**. teller2 did not change it. teller1 can now Start and Complete it. |
| 10 | Log in as **loanofficer1** and open `/operator` | "Assigned queues" lists **L only**. Queue D is not shown. |
| 11 | loanofficer1 runs `fetch('/api/queues/D/call-next',{method:'POST'}).then(r=>r.json().then(b=>console.log(r.status,b)))` in the console | **403** `FORBIDDEN`. The D waiting count on `/queues` does not change. |

### UAT-06: State, history and persistence

| Field | Value |
|---|---|
| Category | **State / history / persistence** |
| Reference | FR-03, FR-13; AC-25, AC-29 (manual part), AC-30; NFR-04 |
| Purpose | A ticket's state is stored on the server. It survives a page reload, a logout and login, and another browser. The operator does not lose the current customer after a refresh. |
| Role(s) | customer1, teller1 |
| Preconditions | S0 done |
| Inputs | Queue `D` |

| Step | Action | Expected result |
|---|---|---|
| 1 | customer1 joins D | Ticket D`<k>` with status Waiting |
| 2 | teller1 presses Call next, then **Start** | The card shows D`<k>` with status Being served |
| 3 | teller1 **refreshes the page (F5)** | After the reload the card still shows **D`<k>`**, status Being served, with the same Called at and Started at times. Only **Complete** is offered. |
| 4 | teller1 logs out and logs in again | The same card is restored, as in step 3 |
| 5 | customer1 logs out, then logs in on the **other** browser and opens `/my-ticket` | D`<k>` with status **Being served** |
| 6 | teller1 presses **Complete** | The card disappears |
| 7 | customer1 refreshes `/my-ticket` | D`<k>` with status **Completed**. Today's earlier tickets from UAT-02 and UAT-03 are also listed with their final statuses. |

### UAT-07: Session end and unauthenticated access

| Field | Value |
|---|---|
| Category | Access (session) |
| Reference | AC-04, AC-06, NFR-01 |
| Purpose | After logout the old session is useless. Protected data needs a valid session. |
| Role(s) | customer1, anonymous |
| Preconditions | Logged in as customer1 |

| Step | Action | Expected result |
|---|---|---|
| 1 | Open `/api/me/entries` | 200 with JSON of customer1's entries |
| 2 | Press Logout, then press the browser **Back** button and reload | You are sent to `/login`. No ticket data is shown. |
| 3 | Logged out, open `/api/me/entries` | **401**, body exactly `{"error":{"code":"UNAUTHENTICATED",...}}`. No entry data. |
| 4 | Logged out, open `/api/queues` and `/api/operator/queues` | 401 `UNAUTHENTICATED` for both |

---

## 6. Product Team dry run (plan check, not independent UAT)

| Item | Value |
|---|---|
| Date | 2026-11-19, about 00:50–01:15 ICT |
| Run by | Product Team. Each account was signed in by WATHITx. The remaining steps were driven with Claude Code in the browser pane. |
| Version | The **earlier** deployed image `e69364e…`, which was replaced by `e6fdff0` on 2026-11-19. The UAT Team tests `e6fdff0`. |
| Purpose | Check that the expected results in this plan match the deployed app before handoff. **This run does not count as UAT execution.** |

What was checked, and what was observed:

| Area | Case and steps | Observed |
|---|---|---|
| Anonymous access | UAT-01 steps 1–3; UAT-07 steps 3–4 | `/queues` redirected to `/login`. A wrong password and an unknown user both produced "Invalid username or password." The API returned an identical 401 `INVALID_CREDENTIALS` body for both, with no cookie. `/api/me/entries`, `/api/queues`, `/api/operator/queues` and `/api/auth/me` all returned 401 `UNAUTHENTICATED`. |
| Login routing | UAT-01 steps 4–7 | customer1 landed on `/queues` with header "Somchai (Senior) CUSTOMER". teller1 landed on `/operator`. `/api/auth/me` had no password field. |
| Join, then serve | UAT-02 | customer1 got D001: Waiting, people ahead 0. The D waiting count went from 0 to 1. teller1's Call next showed D001 Called. Start changed it to Being served. Complete cleared the card. customer1's `/my-ticket` then showed D001 Completed. |
| One active ticket per queue, and rejoin | UAT-03 | A second join on D was rejected with "You already have an active ticket in this queue today." The waiting count stayed at 1. Joining L gave L001. After D001 and L001 were completed, a new join on D was accepted as D003 (D002 belonged to customer2). |
| FIFO order and people ahead | UAT-04 steps 1–3 and 6 | customer2 got D002 with people ahead 1. Call next served D001 first, then D002. Call next on the empty queue showed "No customers are waiting in this queue." |
| Role and ownership | UAT-05 steps 2–11 | customer2 opening customer1's entry: 404 `NOT_FOUND`, no entry data. A customer calling call-next or start: 403 `FORBIDDEN`. customer1 on `/operator`: "You are not allowed to do this." with a Retry button. teller1 pressing Join: "Only customers can join a queue." teller2 calling start or complete on teller1's D002: 403 `NOT_ENTRY_OWNER`. D002 was still Called afterwards, and teller1 could serve it. loanofficer1 saw only queue L. loanofficer1 calling call-next on D: 403 "You are not assigned to this queue." |
| Persistence | UAT-06 steps 3–4 and 7 | After F5, and after logout and login, teller1's card was restored with the same times. Call next was disabled and Complete was enabled. The customer's `/my-ticket` lists completed tickets for today. |
| Not checked in the dry run | UAT-02 steps 6, 8, 10; UAT-04 step 4 | Live polling in a second browser at the same time. The pane holds one session at a time, so these steps need two browsers during real UAT. |

Leftover data: customer1's D003 is WAITING. S0 clears it before UAT.

Notes for testers:

- The login page shows a decorative "Now serving D001" ticket. It is static artwork, not live data.
- Times on the cards are local Bangkok time (HH:MM).

## 7. Recording template (the UAT Team fills this in)

| Case | Tester (name, team) | Date and time (ICT) | Tested version (footer SHA) | Inputs used | Actual result | Result | Evidence ID |
|---|---|---|---|---|---|---|---|
| UAT-01 | | | | | | PASS / FAIL / BLOCKED | |
| ... | | | | | | | |

Report each finding with:

- Issue ID
- Case and step
- Version
- Steps to reproduce
- Expected and actual result
- Severity: **Critical** (data leak, or the main flow cannot be used), **Major** (a Sprint 1 rule is broken and there is no workaround), **Minor** (cosmetic, or a workaround exists)
- Screenshot

Send findings to `<agreed channel, for example GitHub Issues with label "uat" on the repository, or a shared sheet>`.
