# Outgoing bug reports for EN-047_P5 (Workflow and Approval System)

Post each report as a GitHub Issue on the partner repository, or through whatever channel the partner agreed. Lab 6 §3.3 requires each report to have: Issue ID, product owner, reporter, tested version, linked case, preconditions, steps, expected result, actual result, severity and evidence.

---

## BUG-B01: Login form submits credentials in the URL (GET) when JavaScript is not yet hydrated

| Field | Value |
|---|---|
| Product / owner | Workflow and Approval System, EN-047_P5 |
| Reporter | WATHITx, team 2026 bank-queue (Lab 6 UAT team) |
| Tested build | https://approval-system.oangsa.com. Deployed SHA not exposed. Build fingerprint: manifest `7db6a5ca`, `assets/login-DI0BTfdx.js`. |
| Date | 2026-11-20, about 15:20 ICT |
| Linked case | B-UAT-NEW-002 (exploratory); relates to UAT-01 and AC-001 / M01 |
| Severity | **Major.** User passwords are exposed. The password is written into browser history and autocomplete, into the access logs of the server, CDN and proxies, and possibly into `Referer` headers. The user has no workaround, and the fault is invisible to them. |

**Preconditions:** a logged-out browser on `/auth/login`. The page's JS has not finished hydrating, either because the user is quick on a slow connection or because a JS chunk fails to load. In our session, chunks returned 500 on a cold load (see OBS below).

**Steps to reproduce (deterministic)**

1. Open DevTools, go to Settings, and tick **Disable JavaScript**. Alternatively, throttle the network to "Slow 3G".
2. Open https://approval-system.oangsa.com/auth/login.
3. Enter any synthetic email, for example `nobody@example.test`, with the password `not-a-real-password`, and press Sign in.
4. Look at the address bar or the Network panel.

**Expected:** credentials are never placed in a URL. The form either posts them in a request body or cannot be submitted until the app is ready.

**Actual:** the browser navigates to `/auth/login?email=nobody%40example.test&password=not-a-real-password`.

**Evidence**

- Server-rendered HTML of `/auth/login`: `<form noValidate="" class="space-y-4">`. There is no `method` and no `action`, so the browser default is GET to the same URL. The inputs are `name="email"` and `name="password"`.
- Our session's network log contains `GET /auth/login?email=requester%40estza.com&password=<redacted by the tool>` at about 15:20 ICT. That request was made right after `sessionContext-DtQemv_W.js` and `input-hfJVgFuQ.js` returned 500.
- Screenshot or HAR: `<attach evidence ID B-EV-xx>`

**Suggested fix:** add `method="post"` to the form, and do not let the server route accept credentials from a GET query. Keep Sign in disabled until the app has hydrated. Also rotate the password of `requester@estza.com`, because it appeared in a URL during our session.

---

## BUG-B02: Title over 200 characters shows only "Invalid input"

| Field | Value |
|---|---|
| Product / owner | Workflow and Approval System, EN-047_P5 |
| Reporter | WATHITx, Lab 6 UAT team |
| Tested build | Same as BUG-B01 (`7db6a5ca`) |
| Date | 2026-11-20, about 15:35 ICT |
| Linked case | B-UAT-NEW-003; relates to UAT-12 (expected: "A field-specific validation message appears") and AC-004 / AC-015 |
| Severity | **Minor.** The request is still blocked correctly and no data is lost. But the user is not told what is wrong or what the limit is. |

**Preconditions:** signed in as a Requester (we used `uat-requester-b@example.test`), with a General request type.

**Steps to reproduce**

1. Go to New request, choose General request, then Next.
2. Type a Title of 201 characters, for example `W` × 201, and a valid Justification.
3. Press Next.

**Expected:** a field-specific message that states the limit, for example "Title must be 200 characters or fewer." Ideally the field also has `maxlength` or a character counter.

**Actual:** Title shows **"Invalid input"** (`aria-describedby="title.error"`), and the alert at the top also says "Invalid input". The input has no `maxlength` attribute. Probing showed lengths of 50, 100, 150 and 200 are accepted, while 201, 255, 256, 300 and 367 are rejected with the same generic text. An empty title, by contrast, gets the clear message "Title is required."

**Evidence:** screenshot `<attach evidence ID B-EV-xx>` of step 2 with the 367-character title.

---

## Observation (not a confirmed defect): JS chunk 500 leaves the page on "Loading…" forever

On a cold load at about 15:20 ICT, four JS chunks returned **500**: `sessionContext-DtQemv_W.js`, `input-hfJVgFuQ.js`, `AuditTimeline-C5yAn-3_.js` and `RequestResult-Cp93UrQZ.js`. Afterwards `/requests/d59620b4-…` showed only "Loading…" for more than 18 s, with no error and no Retry, until a manual reload. We could not reproduce it again: 0 of 48 sequential and concurrent re-fetches failed. We suggest checking the static hosting for errors under load, and adding an error boundary with Retry for chunk-load failures. This failure is also what triggered BUG-B01 in our session.
