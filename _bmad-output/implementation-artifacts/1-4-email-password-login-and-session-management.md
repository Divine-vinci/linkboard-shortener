# Story 1.4: Email/Password Login and Session Management

Status: done

## Story

As a registered user,
I want to log in with my email and password and log out,
so that I can securely access my account.

## Acceptance Criteria

1. A login page at `/login` with email and password fields accepts valid credentials and signs the user in via Auth.js Credentials provider.
2. After successful login, Auth.js creates a JWT session stored in an HTTP-only cookie and the user is redirected to the dashboard entry route.
3. Session configuration enforces a 24-hour inactivity expiry (`session.maxAge = 60 * 60 * 24`) to satisfy NFR10.
4. Invalid credentials return a generic error message (`"Invalid email or password"`) with no account-enumeration leakage.
5. Failed login attempts are rate limited to a maximum of 10 failed attempts per 15 minutes per IP, returning 429 with retry metadata and `Retry-After` header after the limit is exceeded (NFR12).
6. Authenticated users can log out, which clears the Auth.js session and redirects them to `/login`.
7. Unauthenticated access to dashboard routes is intercepted and redirected to `/login` before protected content renders.
8. Authenticated users visiting `/login` are redirected away from the login page to the dashboard entry route.
9. Login inputs are validated with shared Zod schemas, field-level validation errors are rendered inline for malformed input, and all input handling remains sanitized (NFR11).

## Tasks / Subtasks

- [x] Implement login page and form UX (AC: #1, #4, #8, #9)
  - [x] Create `src/app/(auth)/login/page.tsx` to render the email/password login experience.
  - [x] Create `src/components/auth/login-form.tsx` as a client component with email and password fields, loading state, submit handling, and inline error presentation.
  - [x] Reuse `loginSchema` from `src/lib/validations/auth.ts` for client-side validation before submission.
  - [x] On success, redirect to the dashboard entry route using `router.push()` / `router.replace()`.
  - [x] If an authenticated user reaches `/login`, redirect them server-side to the dashboard entry route via `auth()`.

- [x] Add a dedicated login API surface with failed-attempt rate limiting (AC: #1, #4, #5, #9)
  - [x] Create `src/app/api/v1/auth/login/route.ts` as the versioned login endpoint.
  - [x] Validate request payload with `loginSchema`.
  - [x] Add pre-auth rate-limit enforcement keyed by client IP using a shared helper in `src/lib/rate-limit.ts`.
  - [x] Return generic 401 `{ error: { code: "UNAUTHORIZED", message: "Invalid email or password" } }` for wrong email/password combinations.
  - [x] On rate-limit violation, return 429 `{ error: { code: "RATE_LIMITED", message: "Too many failed login attempts", details: { retryAfter: seconds } } }` and set `Retry-After` header.
  - [x] Ensure successful login attempts reset or clear the failed-attempt counter for that IP.

- [x] Wire Auth.js session login flow to the UI (AC: #1, #2, #3, #4)
  - [x] Update `src/lib/auth/config.ts` only if needed to keep session config explicit and stable (`strategy: "jwt"`, `maxAge: 60 * 60 * 24`).
  - [x] In the login form, call the versioned login endpoint first for validation/rate-limit handling, then call `signIn("credentials", { email, password, redirect: false })` from `next-auth/react` only when the API allows the attempt.
  - [x] Normalize email values consistently before both API submission and `signIn()`.
  - [x] Treat any failed Auth.js credentials response as the same generic invalid-credentials error.

- [x] Implement logout flow and authenticated navigation controls (AC: #6)
  - [x] Create a small reusable logout control such as `src/components/auth/logout-button.tsx` or equivalent auth action component.
  - [x] Call `signOut({ redirectTo: "/login" })` from `next-auth/react` (or exported helper) to destroy the session and redirect.
  - [x] Place the logout action in the protected dashboard shell once available, without building unrelated dashboard features.

- [x] Protect dashboard routes with auth-aware routing (AC: #7, #8)
  - [x] Create `src/middleware.ts` for route protection and future redirect resolution composition.
  - [x] Use Auth.js middleware/auth wrapper to guard dashboard route patterns before page render.
  - [x] Redirect unauthenticated requests for protected routes to `/login`.
  - [x] Redirect authenticated users away from auth-only routes like `/login` when appropriate.
  - [x] Keep middleware matcher scoped so it does not interfere with `/api`, static assets, or future public board routes.

- [x] Add a minimal protected dashboard entry route only if required for auth redirection completeness (AC: #2, #7, #8)
  - [x] If the codebase does not yet expose a dashboard entry route, create a temporary protected shell under `src/app/(dashboard)/page.tsx` and `src/app/(dashboard)/layout.tsx` sufficient to validate session redirects.
  - [x] Keep the page intentionally minimal to avoid pulling Epic 4 dashboard feature scope into this story.
  - [x] If an existing protected dashboard route already exists by implementation time, reuse it instead of adding placeholders.

- [x] Add tests for login/session/rate-limiting behavior (AC: #1-#9)
  - [x] Create `src/app/api/v1/auth/login/route.test.ts` for success, malformed input, invalid credentials, rate-limited attempts, and reset-after-success behavior.
  - [x] Add/extend `src/components/auth/login-form.test.tsx` for inline validation and generic error rendering.
  - [x] Add `src/middleware.test.ts` (or equivalent isolated tests) covering unauthenticated dashboard redirect and authenticated `/login` redirect behavior.
  - [x] Extend `src/lib/validations/auth.test.ts` only if login-specific edge cases are not already covered.

## Dev Notes

### Architecture Compliance

- **Auth.js v5 (NextAuth) remains the session authority** — do not invent a parallel auth/session system. Login must continue to rely on the existing Credentials provider and JWT session strategy configured in `src/lib/auth/config.ts`. [Source: architecture.md#Session Auth: Auth.js v5]
- **Session expiry requirement** — `session.maxAge` must remain 24 hours of inactivity to satisfy NFR10. The story should verify and preserve this behavior rather than changing it. [Source: epics.md#Story 1.4, prd.md#NFR10]
- **Rate limiting on auth endpoints** — authentication endpoints must enforce max 10 failed attempts per 15 minutes per IP. Use a shared helper and keep the implementation compatible with Redis-backed distributed enforcement later. [Source: architecture.md#Rate Limiting: In-memory + Redis, epics.md#Story 1.4, prd.md#NFR12]
- **Standard API response format** — all versioned login endpoint responses must use the shared `{ data }` / `{ error }` wrapper from `src/lib/api-response.ts`. [Source: architecture.md#API Response Formats]
- **Zod validation boundary** — request validation belongs in `src/lib/validations/auth.ts` and is reused between API route + form layer. Do not manually parse credential fields in multiple places. [Source: architecture.md#Validation Pattern]
- **Ownership/data boundaries** — route handlers and middleware must not import Prisma directly. Any user lookup should continue through `src/lib/db/users.ts`. [Source: architecture.md#Data Boundaries]
- **Future middleware composition** — `src/middleware.ts` will later also own redirect-engine concerns. Keep the auth-guard implementation modular so Story 2.7 can extend it without a rewrite. [Source: architecture.md#Redirect Path, architecture.md#Complete Project Directory Structure]

### Technical Requirements

- **Existing Auth.js configuration already present**: `src/lib/auth/config.ts` currently exports `auth`, `handlers`, `signIn`, and `signOut`, uses `PrismaAdapter(prisma)`, `Credentials` provider, `session.strategy: "jwt"`, and `maxAge: 60 * 60 * 24`. Story 1.4 should build on this rather than replacing it.
- **Existing shared schemas already present**: `src/lib/validations/auth.ts` already exports `loginSchema` and `registerSchema`. `loginSchema` currently validates required email + password and lowercases email. Reuse it.
- **Recommended login flow**:
  1. `POST /api/v1/auth/login` validates input and enforces rate limiting.
  2. If allowed, the form then calls Auth.js `signIn("credentials", { redirect: false })`.
  3. If `signIn()` succeeds, redirect to dashboard entry route.
  4. If `signIn()` fails, surface the same generic invalid-credentials error and increment/confirm failed-attempt tracking through the API path.
- **Rate-limit implementation target**: create a reusable helper in `src/lib/rate-limit.ts` designed so today it can run in memory for local/test environments and later swap to Redis-backed storage without route-handler changes.
- **Client IP extraction**: use request headers in a deployment-safe order (`x-forwarded-for`, `x-real-ip`, fallback marker) and normalize to a single IP key. Never trust multiple comma-separated IPs without selecting the first originating value.
- **Generic error policy**: do not reveal whether the email exists, whether the password is wrong, or whether the account is OAuth-only. All auth failures must collapse to `"Invalid email or password"`.
- **Redirect target**: use the project’s protected dashboard entry route. If none exists at implementation time, establish the minimal route under `src/app/(dashboard)/page.tsx` and redirect there.
- **Logout behavior**: use Auth.js sign-out flow, not manual cookie deletion.
- **Middleware scope**: matcher must exclude `_next`, static assets, favicon, and `/api/*`. Public routes such as `/register`, future `/reset-password`, and public board URLs must remain accessible without session.

### File Structure Requirements

Files likely to create:
- `src/app/(auth)/login/page.tsx` — Login page
- `src/components/auth/login-form.tsx` — Email/password login form
- `src/components/auth/logout-button.tsx` — Reusable logout control
- `src/app/api/v1/auth/login/route.ts` — Versioned login endpoint with rate-limit handling
- `src/app/api/v1/auth/login/route.test.ts` — Login route tests
- `src/lib/rate-limit.ts` — Shared auth/API rate-limiting helper
- `src/middleware.ts` — Auth redirect middleware for dashboard protection
- `src/components/auth/login-form.test.tsx` — Form interaction tests
- `src/middleware.test.ts` — Middleware/auth redirect tests

Files likely to modify:
- `src/lib/auth/config.ts` — only if needed to keep session settings explicit or expose helper usage cleanly
- `src/lib/validations/auth.test.ts` — extend if additional login edge-case coverage is required
- `src/types/next-auth.d.ts` — only if type coverage for session/user fields needs adjustment

Conditional/minimal only if needed:
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/page.tsx`

### Anti-Patterns to Avoid

- Do NOT create a separate bespoke session cookie or token system — Auth.js owns sessions.
- Do NOT implement rate limiting only in the client — enforcement must happen server-side on the versioned login endpoint.
- Do NOT expose distinct messages like `"No account found"`, `"Wrong password"`, or `"Use Google login"`.
- Do NOT import `@prisma/client` inside route handlers or middleware — use `src/lib/db/users.ts` and auth helpers.
- Do NOT place login business logic inside the React form component beyond presentation/state orchestration.
- Do NOT over-scope the dashboard work; only create the minimal protected landing shell needed for redirect validation.
- Do NOT let middleware catch static assets, Next internals, or public API routes.
- Do NOT forget to clear/reset the failed-attempt counter after a successful login from the same IP.
- Do NOT use `console.log`; use `src/lib/logger.ts` for unexpected auth/rate-limit errors.

### Testing Requirements

- Co-locate tests with source files, consistent with the project standard.
- Cover malformed JSON / invalid body handling on the login endpoint.
- Cover invalid credentials returning a generic 401 response.
- Cover 10 failed attempts allowed within the rolling window and the 11th rejected with 429 + `Retry-After` header.
- Cover successful login clearing the failed-attempt counter.
- Cover middleware redirects:
  - unauthenticated request to protected dashboard route → `/login`
  - authenticated request to `/login` → dashboard entry route
- Cover login form UX for inline validation, loading state, generic invalid-credential message, and network failure fallback.
- Do NOT test Auth.js internals beyond the project’s integration surfaces.

### Project Structure Notes

- Current implemented auth surface includes:
  - `src/app/(auth)/layout.tsx`
  - `src/app/(auth)/register/page.tsx`
  - `src/components/auth/register-form.tsx`
  - `src/app/api/auth/[...nextauth]/route.ts`
  - `src/lib/auth/config.ts`
  - `src/lib/validations/auth.ts`
- There is **no** `src/middleware.ts` yet and no login page yet.
- There is **no** shared rate-limit helper yet.
- The current codebase has not created the `(dashboard)` route group yet, so the implementer may need a minimal protected destination route to make auth redirect behavior testable without waiting for Epic 4.

### Previous Story Intelligence

Story 1.3 established the baseline auth stack and conventions this story must extend:
- Auth.js v5 is already configured in `src/lib/auth/config.ts` with Prisma adapter, Credentials provider, JWT sessions, `maxAge: 60 * 60 * 24`, and session/JWT callbacks that propagate `user.id`.
- `src/app/api/auth/[...nextauth]/route.ts` already exists and should remain the Auth.js catch-all route.
- `src/lib/validations/auth.ts` already contains a reusable `loginSchema` and `registerSchema`; `loginSchema` lowercases email and validates required credentials.
- Registration uses `signIn("credentials", { redirect: false })` after the custom API succeeds; login should follow the same Auth.js-first session creation pattern, but add the dedicated rate-limit gate before credentials are attempted.
- The project already uses `src/lib/api-response.ts`, `src/lib/errors.ts`, and `src/lib/logger.ts`; Story 1.4 should use the same helper stack rather than introducing auth-specific response/error formats.
- `src/lib/db/users.ts` currently exports `findUserByEmail`, `findUserById`, `createUser`, and `updateUser`. Reuse these data-access functions; do not create duplicate user query paths without need.
- Story 1.3 review history noted env-related test crashes when modules importing `@/config/env` were not mocked correctly. Login/middleware tests should account for that upfront.

### Git Intelligence

- Story artifacts in this repo use `Status: ...`, numbered acceptance criteria, checkbox task lists, detailed Dev Notes, References, and blank/update-ready Dev Agent Record sections.
- Story 1.3 is already marked `done`; Story 1.4 should become the next implementation-ready artifact in sprint tracking.
- Package manager is npm and the repo already has Vitest-based test coverage conventions in place.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Session Auth: Auth.js v5]
- [Source: _bmad-output/planning-artifacts/architecture.md#Rate Limiting: In-memory + Redis]
- [Source: _bmad-output/planning-artifacts/architecture.md#Validation Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Response Formats]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]
- [Source: _bmad-output/planning-artifacts/prd.md#FR23]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR10]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR11]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR12]
- [Source: _bmad-output/implementation-artifacts/1-3-email-password-registration.md]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `npm test`
- `npm run lint`

### Completion Notes List

- Added `src/app/(auth)/login/page.tsx` + `src/components/auth/login-form.tsx` with shared Zod validation, generic invalid-credential handling, loading state, and dashboard redirect.
- Added `src/app/api/v1/auth/login/route.ts` + `src/lib/rate-limit.ts` for login validation, generic 401 responses, IP-based failed-attempt tracking, `429` retry metadata, and reset-after-success behavior.
- Added `src/middleware.ts` + minimal `(dashboard)` shell to protect dashboard routes, redirect authenticated `/login` requests, and provide an in-product logout surface.
- Added test coverage in `src/app/api/v1/auth/login/route.test.ts`, `src/components/auth/login-form.test.tsx`, `src/middleware.test.ts`, and `src/lib/validations/auth.test.ts`.
- Verification: `npm test` ✅, `npm run lint` ✅.

### File List

- `src/app/(auth)/login/page.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/page.tsx`
- `src/app/api/v1/auth/login/route.ts`
- `src/app/api/v1/auth/login/route.test.ts`
- `src/components/auth/login-form.tsx`
- `src/components/auth/login-form.test.tsx`
- `src/components/auth/logout-button.tsx`
- `src/lib/rate-limit.ts`
- `src/lib/validations/auth.test.ts`
- `src/middleware.ts`
- `src/middleware.test.ts`
- `_bmad-output/implementation-artifacts/1-4-email-password-login-and-session-management.md`

### Change Log

- 2026-03-17: Story artifact created for development handoff.
- 2026-03-17: Amelia implemented AC1-AC9, added login/session/rate-limit coverage, and moved story to review.

## Senior Developer Review (AI)

**Reviewer:** Divine
**Date:** 2026-03-17
**Outcome:** Approved

### Issues Found

- No blocking issues found during final review.

### Verification

- `npm test`
- `npm run lint`
- Acceptance criteria reviewed against implementation in login route, form, middleware, and protected dashboard shell.
