# F-01 Auth & RBAC - Feature Contract

**Contract v1 - 2026-11-06**
**Feature:** F-01 Auth & RBAC (Sprint 1)
**Requirements:** FR-01; NFR-01, NFR-02, NFR-07
**Decisions used:** D-07, D-16, D-18, D-20
**Acceptance criteria:** AC-01..AC-08 - **Tests:** TEST-01..TEST-08 (TEST-08 = E2E-01)
**Implementation Issue:** #7 `feature/F-01-auth` (author WATHITx, reviewer SinghLemonH)
**Depends on:** scaffold (#6, merged). **Blocks:** F-02 and F-03 (they use the guards and `@CurrentUser()`).

Shared conventions (error shape, codes, response shapes, Clock, seed, test layout) are in [README.md](README.md) section 3. Scaffold fixes this feature must make are in README section 4 (SA-1..SA-7, SA-9).

---

## 1. Purpose and behavior

Users sign in with a seeded username and password, receive a server-side session in an HttpOnly cookie, can ask "who am I", and can sign out. Every protected endpoint resolves the user **only** from that cookie and checks the role on the server. There is no self-registration, password reset or multi-role account (D-10).

Roles: `CUSTOMER`, `OPERATOR`.

### 1.1 Login workflow

```mermaid
sequenceDiagram
    participant B as Browser (/login)
    participant P as Next Route Handler /api/*
    participant A as NestJS AuthController
    participant S as AuthService
    participant DB as PostgreSQL
    B->>P: POST /api/auth/login {username, password}
    P->>A: forward (same body, headers)
    A->>S: login(username, password)
    S->>DB: SELECT user BY username
    alt user missing or argon2.verify fails
        S-->>A: InvalidCredentialsError
        A-->>B: 401 {error:{code:"INVALID_CREDENTIALS"}} (no Set-Cookie)
    else valid
        S->>S: token = 32 random bytes (base64url)
        S->>DB: INSERT sessions(user_id, token_hash=sha256(token), expires_at=clock.now()+TTL)
        A-->>B: 200 user + Set-Cookie sid=token; HttpOnly; SameSite=Lax; Path=/; Max-Age=TTL
    end
```

### 1.2 Authenticated request workflow (guards, in order)

1. **SessionAuthGuard** - read cookie `sid`. Missing -> 401 `UNAUTHENTICATED`. Look up `sha256(sid)` in `sessions`. Not found -> 401. Found but `expires_at <= clock.now()` -> delete the row, 401. Otherwise attach `{id, username, displayName, role}` to the request.
2. **RolesGuard** with `@Roles('CUSTOMER')` / `@Roles('OPERATOR')` - role not allowed -> 403 `FORBIDDEN`.
3. **Service-level checks** (F-02, F-03): queue assignment (403 `FORBIDDEN`), customer ownership (404 `NOT_FOUND`), operator ownership (403 `NOT_ENTRY_OWNER`).

`@CurrentUser()` returns the user attached by the guard. Controllers and services never take identity or role from the request body, query or headers.

### 1.3 Logout workflow

`POST /api/auth/logout` (guarded) deletes the current session row and clears the cookie (`Set-Cookie: sid=; Max-Age=0; Path=/`). The old token is then unknown -> 401 on any later request.

## 2. Business rules, validation and boundary cases

| # | Rule / case | Expected behavior | Verified by |
|---|---|---|---|
| R1 | Passwords are stored only as argon2id hashes (NFR-02) | `password_hash` starts with `$argon2id$`, never equals the plaintext | TEST-07 |
| R2 | The session token is never stored in plain text | `sessions.token_hash = sha256(token)` (hex); cookie holds the raw token | TEST-01 |
| R3 | Same answer for wrong password and unknown username | both 401 `INVALID_CREDENTIALS`, byte-identical JSON body, no `Set-Cookie` | TEST-02 |
| R4 | Session lifetime = `SESSION_TTL_HOURS` (default 8) from login, computed with the Clock | `expires_at = clock.now() + TTL`; cookie `Max-Age = TTL * 3600` | TEST-01, TEST-05 |
| R5 | Expired session | 401 `UNAUTHENTICATED`; the row is deleted on sight | TEST-05 |
| R6 | Garbage, empty or unknown `sid` | 401 `UNAUTHENTICATED`; no 500 | TEST-03 |
| R7 | Logout invalidates the token | 204; row deleted; old cookie -> 401 | TEST-04 |
| R8 | Logout without a valid session | 401 `UNAUTHENTICATED` (logout is a protected endpoint) | TEST-06 |
| R9 | Every protected endpoint without a cookie | 401 and the body is only `{error:{code,message}}` (NFR-01) | TEST-06 |
| R10 | Login body validation | `username`: string, 1-64 chars; `password`: string, 1-128 chars; no other fields. Violations -> 400 `VALIDATION_FAILED` | TEST-02 (extra case) |
| R11 | Login requires `Content-Type: application/json` (CSRF stance) | other content types (e.g. form-encoded) -> 415 `UNSUPPORTED_MEDIA_TYPE` | TEST-01 (extra case) |
| R12 | Username matching | exact, case-sensitive; no trimming | - (design note) |
| R13 | Logging in again while already logged in | creates a new session; the older session stays valid until it expires or logs out | - (design note) |
| R14 | Response bodies never contain `password_hash`, `token_hash` or the token | checked on login and `/me` | TEST-01, TEST-03 |
| R15 | Secrets (DB password, `SEED_DEMO_PASSWORD`) come only from env vars (NFR-07) | `.env` git-ignored; `.env.example` has no real values | manual check (dod.md 1A, per traceability 5.1) |

**CSRF stance (documented decision):** cookie `SameSite=Lax`, state changes only via POST, JSON-body endpoints reject other content types with 415. Body-less POSTs (logout, call-next, start, complete) rely on `SameSite=Lax`. No CSRF token in this project; a token is a known hardening option.

## 3. Permissions

| Operation | Anonymous | Customer | Operator |
|---|---|---|---|
| `POST /api/auth/login` | yes | yes | yes |
| `POST /api/auth/logout` | 401 | yes | yes |
| `GET /api/auth/me` | 401 | yes (self) | yes (self) |

## 4. API specification

### 4.1 `POST /api/auth/login` (public)

Request (`Content-Type: application/json`):
```json
{ "username": "customer1", "password": "<SEED_DEMO_PASSWORD>" }
```

| Result | Status | Body | Headers |
|---|---|---|---|
| Success | 200 | `{ "id", "username", "displayName", "role" }` | `Set-Cookie: sid=<token>; HttpOnly; SameSite=Lax; Path=/; Max-Age=<TTL s>` (+ `Secure` when `COOKIE_SECURE=true`) |
| Wrong password / unknown user | 401 | `{ "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid username or password." } }` | no `Set-Cookie` |
| Bad body | 400 | `{ "error": { "code": "VALIDATION_FAILED", "message": "..." } }` | |
| Not JSON | 415 | `{ "error": { "code": "UNSUPPORTED_MEDIA_TYPE", "message": "..." } }` | |

### 4.2 `POST /api/auth/logout` (logged in)

No body. Success: **204** (empty body) with `Set-Cookie: sid=; Max-Age=0; Path=/`. No/invalid session: 401 `UNAUTHENTICATED`.

### 4.3 `GET /api/auth/me` (logged in)

Success: **200** `{ "id", "username", "displayName", "role" }`. No/invalid/expired session: 401 `UNAUTHENTICATED`.

### 4.4 Protected endpoint list for TEST-06 (all Sprint 1)

F-01 creates the table-driven TEST-06 with its own two endpoints; F-02 and F-03 append theirs in their PRs. `:id` uses a random valid UUID.

| Method | Path | Added by |
|---|---|---|
| POST | `/api/auth/logout` | F-01 |
| GET | `/api/auth/me` | F-01 |
| GET | `/api/queues` | F-02 |
| POST | `/api/queues/D/entries` | F-02 |
| GET | `/api/me/entries` | F-02 |
| GET | `/api/entries/:id` | F-02 |
| GET | `/api/operator/queues` | F-03 |
| GET | `/api/operator/current-entry` | F-03 |
| POST | `/api/queues/D/call-next` | F-03 |
| POST | `/api/entries/:id/start` | F-03 |
| POST | `/api/entries/:id/complete` | F-03 |

## 5. UI specification

### 5.1 `/login`
- Form: Username, Password (type `password`), "Sign in" button. Both fields required in the browser (UX only; the API validates again).
- **Loading:** button disabled with "Signing in..." while the request runs.
- **Error states** (messages come from `lib/errors.ts`):

| Code | Message (EN) | Message (TH) |
|---|---|---|
| `INVALID_CREDENTIALS` | Invalid username or password. | ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง |
| `VALIDATION_FAILED` | Please enter both username and password. | กรุณากรอกชื่อผู้ใช้และรหัสผ่าน |
| network / 5xx | Something went wrong. Please try again. | เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง |

- **Success:** `CUSTOMER` -> `/queues`; `OPERATOR` -> `/operator`.

### 5.2 Layout (all signed-in pages)
- Header shows `displayName`, role and a **Logout** button. Data comes from `GET /api/auth/me`.
- Logout calls `POST /api/auth/logout`, then navigates to `/login` (also when the call returns 401).
- Any API call that returns 401 on a signed-in page navigates to `/login`.
- Role-based navigation is cosmetic only; the API enforces everything.

### 5.3 Route guard (`apps/web/src/middleware.ts` on Next 15; `proxy.ts` on Next 16 - see SA-7)
- Paths `/queues`, `/my-ticket`, `/operator` (and sub-paths): if there is no `sid` cookie, redirect to `/login`. UX only - it does not validate the token.
- `/` redirects to `/login`.

### 5.4 Shared web plumbing (created in this feature, SA-9)
- `src/app/api/[...path]/route.ts` - Route Handler proxy that reads `API_BASE_URL` at runtime (D-18; system SDS 1.3).
- `src/lib/api.ts` - `fetch('/api/...', { credentials: 'include' })`, parses `{error:{code,message}}` into a typed error.
- `src/lib/errors.ts` - one map from error code to EN/TH message. F-02 and F-03 add their codes.

## 6. Data specification

**No schema change.** Uses tables from migration 001 (`1730800000000-InitMigration.ts`):

| Table | Fields used | Constraints relied on |
|---|---|---|
| `users` | `id`, `username`, `password_hash`, `display_name`, `role` | `username UNIQUE`, `role IN ('CUSTOMER','OPERATOR')` |
| `sessions` | `id`, `user_id`, `token_hash`, `expires_at`, `created_at` | `token_hash UNIQUE`, `user_id` FK `ON DELETE CASCADE`, index `ix_sessions_user` |

Seed: demo users from README 3.6, password from `SEED_DEMO_PASSWORD`, hashed with argon2id at seed time. TypeORM entities `UserEntity`, `SessionEntity` are added (mapping only, `synchronize: false`).

## 7. Implementation outline (non-binding guidance for Issue #7)

| Layer | Item |
|---|---|
| domain | `errors.ts`: add `InvalidCredentialsError` (401), rename codes per SA-2/SA-3 |
| application | `auth.service.ts`: `login`, `logout`, `currentUser(token)`; uses Clock, `PasswordHasher`, `crypto.randomBytes(32)`, `sha256` |
| infrastructure | `entities/user.entity.ts`, `entities/session.entity.ts`, session repository |
| presentation | `auth.controller.ts`, `dto/login.dto.ts`, `guards/session-auth.guard.ts`, `guards/roles.guard.ts`, `decorators/roles.decorator.ts`, `decorators/current-user.decorator.ts`; filter fixes SA-1, SA-4..SA-6 |
| module | `auth.module.ts` exports the guards for QueueModule and ServiceDeskModule |
| web | `/login` page, layout header, middleware, proxy route, `lib/api.ts`, `lib/errors.ts` |

## 8. Acceptance criteria

| AC | Expected outcome | Level | Test |
|---|---|---|---|
| AC-01 | Valid login -> 200, `sid` cookie HttpOnly + SameSite=Lax, body `{id, username, displayName, role}` without the password hash. | API | TEST-01 |
| AC-02 | Wrong password **or** unknown username -> 401 `INVALID_CREDENTIALS`, identical body, no cookie set. | API | TEST-02 |
| AC-03 | `GET /me` with a valid cookie -> 200 current user; missing or garbage cookie -> 401 `UNAUTHENTICATED`. | API | TEST-03 |
| AC-04 | Logout -> 204, session row deleted; reusing the old cookie -> 401. | API | TEST-04 |
| AC-05 | Session past `expires_at` -> 401 and the row is removed. | API | TEST-05 |
| AC-06 | Every protected endpoint (table-driven list, 4.4) without a cookie -> 401 and the body contains only `{error}`. | API | TEST-06 |
| AC-07 | The stored password starts with `$argon2id$` and is not equal to the plaintext. | Integration | TEST-07 |
| AC-08 | UI: anonymous visit to `/queues` or `/operator` redirects to `/login`; login routes CUSTOMER -> `/queues`, OPERATOR -> `/operator`; logout returns to `/login`. | E2E | TEST-08 (E2E-01) |

Negative / boundary / role coverage: AC-02 (invalid login), AC-03 (garbage cookie), AC-05 (expiry boundary), AC-06 (unauthenticated access to every endpoint).

## 9. Version history

| Version | Date | Author | Change | Reason |
|---|---|---|---|---|
| v1 | 2026-11-06 | WATHITx | Initial contract (Issue #5) | Contract before code |
