# Lab 6 Part B: Outgoing UAT of the partner product

Our team tests the partner team's product: Workflow and Approval System, team EN-047_P5.
Status: **DRAFT.** These results come from one session. Read the "Tester identity" row before you copy anything into the PDF.

## B1. Session

| Item | Value |
|---|---|
| Product team | EN-047_P5: Kittipich Charoenthanachot (67070503405), Suthang Sukrueangkun (67070503477) |
| Product | Workflow and Approval System |
| URL tested | https://approval-system.oangsa.com |
| Build fingerprint | Front-end manifest `version=7db6a5ca`, from the `/__manifest?…&version=7db6a5ca` request; login bundle `assets/login-DI0BTfdx.js`. These identify the build only and do not name a commit. A redeploy changes them. |
| Version tested | **Not identifiable.** The site has no `/api/version` and no version footer (see OUT-01). Partner Part A names source SHA `340fe8efd0072ecd64826cae634e0f11d3ce4efb`, but says that SHA is not proof of what is deployed. |
| Source of cases | Partner PDF "CPE 334 Lab & Project UAT Est Oangsa", Part A, UAT-01 to UAT-49 |
| Date and time | Session 1: 2026-11-20, about 14:10–14:45 ICT. Session 2 (the previously BLOCKED cases and an exploratory bug hunt): 2026-11-20, about 15:20–16:10 ICT. The build was the same in both sessions: `login-DI0BTfdx.js` and manifest `7db6a5ca`. |
| Tester identity | WATHITx signed in to each account by hand and watched the run. Claude Code (AI assistant) drove the browser steps and recorded the observations. **Before submission:** SinghLemonH must also run, or re-run and confirm, some cases by hand (Lab 6 §3.2: both students must participate). The AI-use declaration must state this split. |
| Accounts used | Session 1: `requester@estza.com` (REQUESTER), `reviewer@estza.com` (REVIEWER), `admin@estza.com` (ADMINISTRATOR). Session 2: `uat-requester-b@example.test`, `uat-reviewer-b@example.test`, `uat-dual-role@example.test`, `uat-no-reviewer@example.test`, `uat-disabled@example.test`. Passwords were supplied by the partner and are not recorded here. |
| Test data created | Session 1: REQ-00000002 "UAT-B Draft WATHITx 01" (APPROVED) and REQ-00000003 "UAT-B Direct WATHITx 02" (REJECTED). Session 2: two drafts with no request number: one under Requester B with a 200-character title starting "UATBWWW…", and "UAT-B 46 no reviewer WATHITx" under the no-reviewer account. The partner's own fixtures (REQ-00000004 to 00000006 and their drafts) were not changed and no decision was made on them. No active task was left behind. |

## B2. Results summary

| Result | Count | Cases |
|---|---|---|
| PASS | 46 | 01–16, 18–40, 42–48 |
| BLOCKED | 0 | — (all 9 earlier BLOCKED cases were run in session 2) |
| N/A (conditional, per partner A1) | 2 | 17: pagination needs more than 10 owned requests and only 4 exist. 49: no stacked Admin+Reviewer account was provisioned. |
| NOT RUN | 1 | 41: a keyboard-only journey needs a human tester |
| FAIL (Part A cases) | 0 | — |
| Additional cases (B-UAT-NEW) | 4 | 001 PASS, 002 **FAIL (BUG-B01)**, 003 **FAIL (BUG-B02)**, 004 PASS |

Required Lab 6 categories:

| Category | Cases | Result |
|---|---|---|
| Normal journey | UAT-10, UAT-45, UAT-28 | PASS |
| Business rule | UAT-29, UAT-31, UAT-11 | PASS |
| Forbidden role or ownership | UAT-22, UAT-26, UAT-27, UAT-38, UAT-44, B-UAT-NEW-001 | PASS |
| State / history / persistence | UAT-33 to UAT-37 | PASS |

## B3. Execution log

All times are 2026-11-20 ICT. "Req" means `requester@estza.com`, "Rev" means `reviewer@estza.com` and "Adm" means `admin@estza.com`.

| Case | Account | Input / action | Actual observation | Result |
|---|---|---|---|---|
| UAT-01 | Req | Correct credentials | Landed on `/dashboard`. Header shows "Requester Estza / Requester". Menu: Dashboard, My Requests, Settings. | PASS |
| UAT-02 | – | `requester@estza.com` with password `wrong-pass-123` | "Email or password is incorrect." Stayed on `/auth/login`. `POST /api/v1/auth/login` returned 401. `/api/v1/auth/me` returned 401. | PASS |
| UAT-03 | – | `nobody-uat99@estza.com` with password `wrong-pass-123` | Same message as UAT-02. The 401 body was identical (`UNAUTHENTICATED`, "Authentication required"), so the response does not reveal whether the account exists. | PASS |
| UAT-04 | Req | Full page reload on `/requests` and on a request detail page | Still signed in as Requester Estza. The list and the detail loaded again. | PASS |
| UAT-05 | Req | Account menu, then Sign out | Redirected to `/auth/login`. | PASS |
| UAT-06 | – (after sign-out) | Pasted `/requests/d59620b4-…` (REQ-00000002) | Redirected to `/auth/login?from=…`. No request data was shown. Browser Back also stayed on login. | PASS |
| UAT-08 | Req | General request. Title "UAT-B Draft WATHITx 01" only, then Save Draft | "Draft saved. No request number or approval task has been created." API: `status DRAFT`, `requestNumber null`. | PASS |
| UAT-09 | Req | Added a justification, priority High, category Operations, used Back, then Save Draft again | Same draft updated (`PATCH …/draft`, version 0→1). All values were kept. Still no number. Save Draft takes about 5–10 s. | PASS |
| UAT-10 | Req | Review & Submit, then Confirm submission | "Request submitted". REQ-00000002 is Pending approval. API `currentApprovers`: Reviewer Estza, ACTIONABLE. | PASS |
| UAT-11 | Req | Step 2 Next with Title and Justification empty | "Title is required." and "Justification is required." Both fields are `aria-invalid`. Stayed on step 2. In step 3, Category empty gives "Category is required." | PASS |
| UAT-12 | Req | Title of 5 spaces with a valid justification. (The partner did not name a restricted field, so the tester chose Title.) | "Title is required." Stayed on step 2. The justification was kept. | PASS (tester-chosen field) |
| UAT-13 | Req | Corrected the title to "UAT-B Direct WATHITx 02". Category Other, which shows a conditional required field "Additional details". Then submitted. | Submitted as REQ-00000003, Pending approval. Earlier values were kept. | PASS |
| UAT-14 | Req | Compared REQ-00000002 with REQ-00000003 | The numbers are different. | PASS |
| UAT-15 | Req | Opened My Requests | Both requests listed with title, number, type, priority, department and "Pending approval". | PASS |
| UAT-16 | Req | Clicked the Number header twice | Ascending: 01, 02, 03, Draft. Descending: 03, 02, 01, Draft. URL `?sort=requestNumber+asc/desc`. `aria-sort` was updated. | PASS |
| UAT-17 | – | – | Only 4 owned requests, with a minimum of 10 rows per page, so there is a single page. | N/A |
| UAT-18 | Req | Opened REQ-00000002 from the list | Correct number, title, status, type, priority, requester, department and justification. | PASS |
| UAT-19 | Req | Opened the Overview, Approval, History and Discussion/Files tabs | Approval: "Stage 1 (active) … Reviewer Estza, Action required". History: created, draft updated, submitted. Discussion: "not available yet". Each tab sets `aria-selected`. | PASS |
| UAT-20 | Req | Opened detail from a list sorted desc and searched for REQ-00000002, then clicked the "My Requests" back link | Returned to `/requests?sort=requestNumber+desc&search=REQ-00000002`. The search box still held the text and showed 1 row. | PASS |
| UAT-23 | Req | Opened the submitted REQ-00000002 | No edit control. API `availableActions: []`. | PASS |
| UAT-24 | Rev | Opened My Reviews | REQ-00000002 and REQ-00000003 shown as Actionable, assigned to Reviewer Estza, due 23 Nov. | PASS |
| UAT-28 | Rev | Approve on REQ-00000002 (reason left empty), then Confirm approval | "Decision recorded. Request status: APPROVED." | PASS |
| UAT-29 | Rev | Reject on REQ-00000003: (a) empty reason; (b) 4 spaces | (a) The browser's required check blocked it, and no request was sent. (b) "Enter a nonblank reason.", and no decision request was sent. The task stays Actionable, version 0. | PASS |
| UAT-30 | Rev | Reject with reason "UAT-B synthetic rejection: category Other lacks cost detail." | `POST …/decisions` returned 201. "Request status: REJECTED." | PASS |
| UAT-31 | Rev | Reloaded the completed REQ-00000002 task URL | "Read-only handled task, Stage 1 · Approved". No Approve or Reject button. History shows a single DECISION APPROVE. | PASS |
| UAT-32 | Rev | Opened My Reviews | "No reviews assigned." 0 results. | PASS |
| UAT-33 | Req | REQ-00000002 History tab | DECISION APPROVE and REQUEST APPROVED, by Reviewer Estza, 20 Nov 2026 14:26 (Bangkok). | PASS |
| UAT-34 | Req | REQ-00000003 History tab | DECISION REJECT with the reason text shown, then REQUEST REJECTED, by Reviewer Estza at 14:26. | PASS |
| UAT-35 | Req | Reloaded REQ-00000002 while Pending | Same number, title and Pending status after the reload. | PASS |
| UAT-36 | Req | Reopened REQ-00000002 after approval | Still Approved, with the history intact. | PASS |
| UAT-37 | Req | Signed out and in again (the Reviewer and Admin sessions ran in between), then opened REQ-00000003 | Still Rejected, with the reason and history unchanged. | PASS |
| UAT-38 | Adm | Opened `/requests/d59620b4-…` and `/reviews/0c8c5b99-…` | "This request is unavailable." and "This task is unavailable." No content was shown. | PASS |
| UAT-39 | Req | Step 2, Next to step 3, then Back | Title, justification and priority High were all kept. | PASS |
| UAT-40 | Req and Rev | 375×812: My Requests, request detail, New request, My Reviews, review task | `scrollWidth` = 375 on every page, so there is no horizontal scroll. The list switches to cards and the actions stay reachable. | PASS |
| UAT-42 | Req | Searched "zz-no-such-title-9981" | "No requests match your filters." with a Clear filters button. 0 results. | PASS |
| UAT-44 | Req, Rev, Adm | Inspected the navigation for each account | Req: Dashboard, My Requests, Settings. Rev: Dashboard, My Reviews, Settings. Adm: Dashboard, Settings. Rev and Adm on `/requests` see "available to Requester accounts only". Adm on `/requests/new` sees "A Requester role is required". | PASS |
| UAT-45 | Req | New request submitted straight from Review & Submit, without Save Draft | Exactly one new request, REQ-00000003, Pending, with an assigned task (seen in UAT-24). | PASS |
| UAT-48 | Req | `/requests/00000000-0000-4000-8000-00000000dead` | "This request is unavailable." No other data shown. | PASS |
| B-UAT-NEW-001 | Rev | Opened the requester's unassigned draft "TEST" (`/requests/b30a273d-…`) and the unassigned REQ-00000001 (`/requests/452ab860-…`) | Both show "This request is unavailable." (API 404). | PASS |

### Session 2: the 9 previously BLOCKED cases, plus exploratory tests (2026-11-20, about 15:20–16:10 ICT)

"ReqB" is Requester B, "RevB" is Reviewer B, "Dual" is the dual-role account, "NoRev" is the missing-reviewer account and "Dis" is the disabled account.

| Case | Account | Input / action | Actual observation | Result |
|---|---|---|---|---|
| UAT-07 | Req, then ReqB | Req opened REQ-00000002 and signed out. ReqB signed in, opened My Requests, then pressed browser Back twice. | ReqB sees only REQ-00000004 "UAT Requester B control". After Back, still ReqB and no REQ-00000002 data. Back can display `/auth/login` while still signed in (OBS-05). | PASS |
| UAT-21 | ReqB | My Requests; searched "UAT-B Draft WATHITx" and "REQ-00000002" | The list has only REQ-00000004. Both searches show "No requests match your filters." | PASS |
| UAT-22 | ReqB | Opened `/requests/d59620b4-…` (A's REQ-00000002) and the same URL with `?tab=history` | "This request is unavailable." API `GET /requests/d59620b4…` returned 404. No timeline call was made. | PASS |
| UAT-43 | ReqB | `/requests?sort=invalid-uat`, then "Clear invalid criteria" | "Some search criteria are invalid. Adjust filters or clear them to continue." The button returned to `/requests` with REQ-00000004 listed. | PASS |
| UAT-25 | RevB | My Reviews | REQ-00000004 and REQ-00000006 are Actionable for UAT Reviewer B. Reviewer A's REQ-00000005 is absent. | PASS |
| UAT-26 | RevB | Opened `/reviews/aea9c885-…` (Reviewer A's REQ-00000005 task), and also A's completed task `/reviews/0c8c5b99-…` | "This task is unavailable." No buttons. API returned 404 for both. | PASS |
| UAT-27 | Dual | Menu shows My Requests and My Reviews. Opened My Reviews, then the REQ-00000006 task URL directly. | The user owns REQ-00000006 (Pending), but My Reviews says "No reviews assigned." Opening the task `/reviews/660d3e20-…` shows "This task is unavailable." with no Approve button. | PASS |
| UAT-46 | NoRev | New General request (Department "UAT No Reviewer"), Submit, then Confirm, done twice | Both attempts: `POST …/submit` returned 409 and showed "Submission configuration is incomplete. Contact an administrator". No request number. My Requests shows a single Draft; the retry reused the same draft ID and created no duplicate. | PASS |
| UAT-47 | Dis | WATHITx signed in with the supplied disabled credentials, then opened `/requests` | `POST /auth/login` returned 401 and showed the generic "Email or password is incorrect.", so it does not reveal that the account is disabled. `/auth/me` returned 401. `/requests` redirected to `/auth/login?from=%2Frequests`. | PASS |
| B-UAT-NEW-002 | Req | Normal sign-in on `/auth/login` while the page's JS chunks were still loading (two chunks returned 500 on this load) | The browser sent **`GET /auth/login?email=requester%40estza.com&password=<redacted>`**, with the credentials in the URL. The server-rendered form is `<form noValidate class="space-y-4">`, which has no `method` and no `action`, and its inputs have `name="email"` and `name="password"`. Any submit before hydration therefore falls back to a native GET. | **FAIL → BUG-B01** |
| B-UAT-NEW-003 | ReqB | Title of 201 / 255 / 300 / 367 characters, then Next. Also 50 / 100 / 150 / 200 characters. | Up to 200 is accepted. From 201 the field shows only **"Invalid input"**: no limit, no `maxlength`, no character counter. Compare "Title is required." for an empty title. | **FAIL → BUG-B02** |
| B-UAT-NEW-004 | ReqB | Invalid list parameters: `pageSize=100000`, `pageSize=0`, `pageNumber=-1`, `pageNumber=abc`, `pageNumber=999`, `status=HACKED`, a 300- and a 3,000-character `search`, a multi-field `sort` | Each one either shows a specific message ("Choose 10, 20, 50 or 100 rows per page.", "Choose a valid status.", "Some search criteria are invalid…" with Clear) or falls back safely. No crash and no horizontal overflow. | PASS |

## B4. Findings for the partner

Session 2 confirmed **2 product defects** (BUG-B01 and BUG-B02). The bug texts ready to post are in `bugs-for-partner.md`. All findings:

| ID | Type | Description | Suggested severity |
|---|---|---|---|
| **BUG-B01** | **Defect (security)** | The login form falls back to GET, which puts the email and password in the URL query string. This happens if the user submits before JS hydration, or if a JS chunk fails to load. Observed for real in this session. The password then ends up in browser history, server and proxy access logs, and possibly in Referer headers. Fix: render `<form method="post">` (or set an `action` that does not accept GET with credentials), and keep the submit button disabled until hydrated. | **Major**: credential exposure. No workaround exists for the user. |
| **BUG-B02** | Defect (validation message) | A title longer than 200 characters gives only "Invalid input". The user is not told the limit. This does not meet the partner's own UAT-12 expectation of a field-specific, helpful message. | Minor |

| ID | Type | Description | Suggested severity |
|---|---|---|---|
| OUT-01 | Handoff gap (Lab 6 §3.1) | The deployed revision cannot be identified. There is no `/api/version`, no build footer, and only `/health` exists. Part A gives a source SHA only. Fix: add the exact deployed SHA to Part A, or expose it, and tell us before any redeploy. | Not a product defect. Must fix for acceptance traceability. |
| OUT-02 | Handoff gap, **resolved** | The partner supplied the missing fixtures on 2026-11-20, and all 9 BLOCKED cases have now run. UAT-49 is still N/A (no stacked Admin+Reviewer account). | Closed |
| OBS-03 | Observation, intermittent | On a cold load, `sessionContext`, `input`, `AuditTimeline` and `RequestResult` chunks returned **500**. The page then stayed on "Loading…" for more than 18 s, with no error message and no Retry, until a manual reload fixed it. It did not reproduce later: 0 of 48 sequential and concurrent re-fetches failed. This is the cause behind BUG-B01 in this session. Suggestion: add a chunk-load error boundary with Retry. | Report as an observation; not reproducible on demand |
| OBS-04 | Observation, cosmetic | A valid 200-character title with no spaces wraps every ~7 characters in the desktop My Requests table, making one row about 30 lines tall. The detail page and the 375 px card layout handle it fine. | Cosmetic |
| OBS-05 | Observation | A signed-in user who presses browser Back can land on `/auth/login` without being redirected to the dashboard. The session is still valid. | Cosmetic |
| OBS-01 | Observation | Save Draft, submit and detail loads take about 5–10 s, with "Loading request…" shown in the meantime. No AC sets a time limit. | Not a defect |
| OBS-02 | Observation | A draft shows Department "Operations" in the form, but the API saves `department: null`. Submit then resolves it to Operations. The request list shows "No department" for drafts. | Not a defect unless the partner's spec says a draft keeps its department |

## B4b. Independent re-test of corrected defects (2026-11-21)

| Item | Value |
|---|---|
| Partner correction chain | BUG-B01: issue `oangsa/approval-system#71`, fixed by PR #73 into `sprint-1-staging` (merge `b8d8341`). BUG-B02: issue #72, fixed by PR #74 (merge `5b8c4b3`). Released to `main` by PR #75 (`582d876`), then PR #76 (dev) and PR #77 (`main`, merge `39a32500e5d9a626055ab0a93da0aee906c85302`). |
| Build re-tested | https://approval-system.oangsa.com. New fingerprint: `assets/login-CIg_Jsqs.js` (was `login-DI0BTfdx.js`). `/api/version` still returns 404, so the deployed SHA is **as stated by the partner** (`39a3250`, PR #77) and is not proven by the site (OUT-01 still open). |
| Re-tested by | WATHITx signed in by hand. Claude Code drove the steps and recorded the observations. |

| Case / bug | Action | Actual observation | Result |
|---|---|---|---|
| B-UAT-NEW-002 / BUG-B01 | (a) Fetched the server HTML of `/auth/login`. (b) Loaded `/auth/login` in an iframe with scripts disabled (`sandbox="allow-same-origin allow-forms"`), typed `nobody@example.test` / `not-a-real-password`, clicked Sign in, then forced a native `form.submit()`. (c) Normal page after hydration. | (a) `<form noValidate class="space-y-4" method="post">`. The submit button is server-rendered `disabled`. (b) Clicking the disabled button did nothing. The forced native submit stayed on `/auth/login?nojs-retest=1`, with **no email or password in the URL**. (c) After hydration Sign in is enabled. A wrong-password login sends `POST /api/v1/auth/login`, gets 401 and shows "Email or password is incorrect." | **PASS** |
| B-UAT-NEW-003 / BUG-B02 | Requester B, New request: Title of 0, 200, 201 and 367 characters, then Next | 200 is accepted. 201 and 367 show **"Title must be 200 characters or fewer."** under Title and in the top alert. A live counter shows e.g. "201 / 200 characters (excluding leading and trailing spaces)". Focus returns to Title. 0 characters still shows "Title is required." | **PASS** |
| Regression spot-check | UAT-01 (sign-in works on the new form), UAT-02/03 (wrong credentials), UAT-15/21 (Requester B list holds only its own items), UAT-22 (A's REQ-00000002 link) | All behave as in session 1/2. B's list: Draft and REQ-00000004 only. A's link: "This request is unavailable." | PASS |

## B5. Decision

**Recommended decision: Accepted with documented minor limitations** for the partner's Sprint 1 scope, on the build re-tested on 2026-11-21 (fingerprint `login-CIg_Jsqs.js`; partner-stated SHA `39a3250`).

Basis:

- All 46 executable Part A cases passed.
- The only Major defect (BUG-B01) and the Minor defect (BUG-B02) are fixed, and we re-tested both independently.
- No critical or major defect is open, and no required case is BLOCKED.

Limitations to state in the sign-off:

1. OUT-01: there is no runtime version endpoint, so the deployed SHA rests on the partner's statement plus the build fingerprint.
2. OBS-03: one intermittent cold-load 500 on JS chunks, with no Retry UI. It is not reproducible.
3. OBS-04 and OBS-05: cosmetic.
4. UAT-41 (keyboard-only) is NOT RUN; UAT-17 and UAT-49 are N/A.

**This decision is not final until the students sign it.** Before recording it:

- WATHITx and SinghLemonH run UAT-41 by hand.
- SinghLemonH confirms a sample of cases by hand.
- Both students sign with their names, the date, and the version above.

If UAT-41 fails, add the finding and decide again.
