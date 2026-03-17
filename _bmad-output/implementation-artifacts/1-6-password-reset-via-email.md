# Story 1.6: Password Reset via Email

Status: ready-for-dev

## Story

As a registered user,
I want to reset my password via email,
so that I can regain access if I forget my password.

## Acceptance Criteria

1. **Given** I am on the login page, **When** I click "Forgot password?", **Then** I am navigated to `/reset-password`.

2. **Given** I am on the password reset page, **When** I enter my registered email address and submit, **Then** a password reset email is sent with a secure, time-limited token (1 hour expiry), **And** I see a confirmation message regardless of whether the email exists in the system (no user enumeration per NFR12 spirit).

3. **Given** I receive a reset email, **When** I click the reset link, **Then** I am taken to `/reset-password?token=<token>` where I can enter a new password.

4. **Given** I have a valid reset token, **When** I submit a new password (minimum 8 characters), **Then** my password is updated (hashed with bcrypt, cost factor 12), all existing sessions are invalidated, **And** I am redirected to `/login` with a success message.

5. **Given** I have an expired or invalid reset token, **When** I try to use it, **Then** I see an error message and am prompted to request a new reset.

6. **Given** I request multiple resets, **When** a new token is generated, **Then** any previous unused tokens for that email are invalidated.

7. All password reset pages are keyboard accessible with visible focus states (NFR22, NFR24).

## Tasks / Subtasks

- [ ] Install email transport library and configure environment (AC: #2)
  - [ ] Add `nodemailer` (or `resend`) to dependencies
  - [ ] Add email environment variables to `src/config/env.ts` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`)
  - [ ] Update `.env.example` with email placeholders
  - [ ] Create `src/lib/email/send.ts` — thin wrapper around transport with `sendEmail({ to, subject, html })` interface

- [ ] Create password reset token management (AC: #2, #4, #5, #6)
  - [ ] Create `src/lib/auth/password-reset.ts` with functions:
    - `createPasswordResetToken(email: string)` — generates crypto-random token, hashes it, stores via Prisma `VerificationToken` with `identifier=email`, `expires=now+1h`; invalidates any existing tokens for that email first
    - `validatePasswordResetToken(token: string)` — looks up token, checks expiry, returns identifier (email) or null
    - `consumePasswordResetToken(token: string)` — deletes the token after successful use
  - [ ] Token stored hashed (SHA-256) in DB; raw token sent in email URL
  - [ ] Create `src/lib/auth/password-reset.test.ts`

- [ ] Create password reset validation schemas (AC: #2, #4)
  - [ ] Add to `src/lib/validations/auth.ts`:
    - `forgotPasswordSchema` — `{ email: z.string().trim().email().toLowerCase() }`
    - `resetPasswordSchema` — `{ token: z.string().min(1), password: z.string().min(8).max(128) }`

- [ ] Create API route: POST `/api/v1/auth/forgot-password` (AC: #2, #6)
  - [ ] Validate input with `forgotPasswordSchema`
  - [ ] Rate limit by IP (reuse existing `src/lib/rate-limit.ts` — 5 requests per 15 minutes)
  - [ ] Look up user by email; if found, generate token and send reset email
  - [ ] Always return `{ data: { message: "If an account exists..." } }` (200 OK) regardless of email existence
  - [ ] Create `src/app/api/v1/auth/forgot-password/route.ts`

- [ ] Create API route: POST `/api/v1/auth/reset-password` (AC: #4, #5)
  - [ ] Validate input with `resetPasswordSchema`
  - [ ] Validate token via `validatePasswordResetToken()`
  - [ ] If valid: hash new password (bcrypt, cost 12), update user via `updateUser()`, consume token, invalidate all sessions for that user (delete from `sessions` table)
  - [ ] If invalid/expired: return `{ error: { code: "INVALID_TOKEN", message: "..." } }` (400)
  - [ ] Create `src/app/api/v1/auth/reset-password/route.ts`

- [ ] Create forgot password UI page (AC: #1, #2, #7)
  - [ ] Create `src/app/(auth)/reset-password/page.tsx` — email input form
  - [ ] On submit, POST to `/api/v1/auth/forgot-password`
  - [ ] Show success message after submission (same message always)
  - [ ] Add "Forgot password?" link on login page (`src/app/(auth)/login/page.tsx`)

- [ ] Create reset password UI page (AC: #3, #4, #5, #7)
  - [ ] Enhance `src/app/(auth)/reset-password/page.tsx` to detect `?token=` query param
  - [ ] When token present: show new password form; POST to `/api/v1/auth/reset-password`
  - [ ] On success: redirect to `/login` with success message (reuse `AuthErrorBanner` pattern for success)
  - [ ] On invalid token: show error with link to request new reset

- [ ] Add tests (AC: all)
  - [ ] `src/lib/auth/password-reset.test.ts` — token generation, validation, expiry, consumption
  - [ ] `src/app/api/v1/auth/forgot-password/route.test.ts` — rate limiting, always-200 response, email send mock
  - [ ] `src/app/api/v1/auth/reset-password/route.test.ts` — valid reset, invalid token, expired token, session invalidation
  - [ ] Component tests for reset password page states

## Dev Notes

### Architecture Compliance

- **Auth.js v5 + Prisma adapter** remains the auth authority. Password reset uses the existing `VerificationToken` model from the Prisma schema — do NOT create a custom token table. [Source: architecture.md#Session Auth: Auth.js v5]
- **bcrypt cost factor 12** for password hashing — same as registration (Story 1.3). [Source: architecture.md#Password Hashing: bcrypt]
- **Zod validation at API boundary** — shared schemas between frontend forms and route handlers. [Source: architecture.md#Validation Pattern]
- **API response format** — wrap in `{ data }` or `{ error }` objects. [Source: architecture.md#API Response Formats]
- **Rate limiting** — reuse existing `src/lib/rate-limit.ts` infrastructure. Auth endpoints: 10 failed attempts per 15 min per IP (NFR12). Apply separately to forgot-password endpoint. [Source: architecture.md#Rate Limiting]
- **Data access through `lib/db/`** — all Prisma access goes through `src/lib/db/` functions. For token operations, either add to existing `src/lib/db/users.ts` or create `src/lib/db/tokens.ts`. [Source: architecture.md#Data Boundaries]
- **Route handlers are thin** — validate (Zod), call lib functions, return formatted response. No business logic in handlers. [Source: architecture.md#API Boundaries]
- **Never log passwords or tokens** — structured JSON logging only. [Source: architecture.md#Logging Pattern]

### Technical Requirements

- **Email transport**: No email library currently installed. Add `nodemailer` (mature, widely used) with SMTP transport. For dev/test, use environment flag or mock transport.
- **Token security**: Generate token with `crypto.randomBytes(32).toString('hex')`. Store SHA-256 hash in `VerificationToken.token` field. Send raw token in email URL. This prevents DB-leak token reuse.
- **VerificationToken model** already exists in `prisma/schema.prisma`:
  ```
  model VerificationToken {
    identifier String    // use as email
    token      String    @unique   // store SHA-256 hash
    expires    DateTime  // set to now + 1 hour
    @@unique([identifier, token])
    @@map("verification_tokens")
  }
  ```
- **Session invalidation**: After password change, delete all rows from `sessions` table where `user_id` matches. Auth.js JWT sessions are stateless but the Prisma adapter stores sessions — clearing these ensures any database-backed session checks fail.
- **Environment variables** needed (add to `src/config/env.ts`):
  - `SMTP_HOST` (required in production, optional in dev)
  - `SMTP_PORT` (default 587)
  - `SMTP_USER` (required in production)
  - `SMTP_PASS` (required in production)
  - `SMTP_FROM` (e.g., `noreply@linkboard.app`)
- **Email content**: Plain password reset email with a link. No fancy HTML templates needed for MVP. Link format: `${NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`

### File Structure Requirements

Files to **create**:
- `src/lib/email/send.ts` — email transport wrapper
- `src/lib/email/send.test.ts` — email sending tests
- `src/lib/auth/password-reset.ts` — token CRUD logic
- `src/lib/auth/password-reset.test.ts` — token tests
- `src/app/api/v1/auth/forgot-password/route.ts` — forgot password endpoint
- `src/app/api/v1/auth/reset-password/route.ts` — reset password endpoint

Files to **modify**:
- `src/config/env.ts` — add SMTP env vars
- `.env.example` — add SMTP placeholders
- `src/lib/validations/auth.ts` — add `forgotPasswordSchema`, `resetPasswordSchema`
- `src/app/(auth)/login/page.tsx` — add "Forgot password?" link
- `src/app/(auth)/reset-password/page.tsx` — create or replace with dual-mode page (request form vs. new password form based on `?token=` presence)
- `package.json` — add `nodemailer` dependency

### Anti-Patterns to Avoid

- Do NOT reveal whether an email exists in the system — always return the same response from forgot-password endpoint.
- Do NOT store raw tokens in the database — hash with SHA-256 before storing.
- Do NOT skip session invalidation after password change.
- Do NOT build a custom token table — use the existing `VerificationToken` Prisma model.
- Do NOT send password reset emails synchronously blocking the response — send and respond, but don't await delivery confirmation.
- Do NOT create a separate `(auth)/forgot-password/` route — use `/reset-password` for both states (request form + new password form).

### Testing Requirements

- Mock `nodemailer` transport in tests — never send real emails.
- Test token expiry by manipulating the `expires` field.
- Test that forgot-password returns 200 for both existing and non-existing emails.
- Test rate limiting on forgot-password endpoint.
- Test session invalidation after successful password reset.
- Test invalid/expired token returns appropriate error.
- Test password validation (minimum 8 chars, max 128).

### Previous Story Intelligence

**From Story 1.5 (OAuth Login):**
- Auth error banner component exists at `src/components/auth/auth-error-banner.tsx` — reuse for success/error messages on reset pages.
- OAuth buttons component pattern at `src/components/auth/oauth-buttons.tsx` — follow same component structure.
- Login page already handles query-param-based error display — extend for success messages after password reset.
- `src/config/env.ts` pattern: use `.default("")` for optional env vars in dev, required in production.
- Tests use vitest with mocks — follow same patterns. 56 tests currently passing.
- `allowDangerousEmailAccountLinking` is enabled — OAuth accounts link by email, relevant for users who registered via OAuth and might try password reset.

**From Story 1.4 (Login & Sessions):**
- Login page at `src/app/(auth)/login/page.tsx` — add forgot password link here.
- Session management via Auth.js JWT strategy with 24h max age.
- `src/lib/rate-limit.ts` provides IP-based rate limiting — reuse for forgot-password.

**From Story 1.3 (Registration):**
- `src/lib/db/users.ts` has `findUserByEmail()`, `updateUser()` — reuse both.
- `src/lib/validations/auth.ts` has `registerSchema` and `loginSchema` — add new schemas alongside.
- Password hashing: `bcrypt.hash(password, 12)` pattern established.

### Git Intelligence

Recent commits follow pattern: `[BMAD Phase 4] Story X.Y: Title`. Files modified in 1.5:
- Auth config, env config, login/register pages, new component files with co-located tests.
- Test setup in `vitest.setup.ts` — may need SMTP env defaults for test environment.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.6]
- [Source: _bmad-output/planning-artifacts/architecture.md#Session Auth: Auth.js v5]
- [Source: _bmad-output/planning-artifacts/architecture.md#Password Hashing: bcrypt]
- [Source: _bmad-output/planning-artifacts/architecture.md#Rate Limiting]
- [Source: _bmad-output/planning-artifacts/architecture.md#Validation Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Response Formats]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Logging Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]
- [Source: _bmad-output/planning-artifacts/prd.md#FR24]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR8]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR10]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR11]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR12]
- [Source: _bmad-output/implementation-artifacts/1-5-oauth-login-github-and-google.md]
- [Source: prisma/schema.prisma#VerificationToken]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
