# Story 1.3: Email/Password Registration

Status: done

## Story

As a visitor,
I want to register an account using my email and password,
so that I can access Linkboard's features.

## Acceptance Criteria

1. A registration page at `/register` with email and password fields accepts valid input (email format, password minimum 8 characters) and creates a new user account with the password hashed using bcrypt (cost factor 12).
2. After successful registration, the user is automatically logged in via Auth.js session and redirected to the dashboard.
3. The password is never stored in plaintext — only the bcrypt hash is persisted in `password_hash` column (NFR8).
4. If the submitted email already exists, a clear error message is shown ("Email is already registered") and no duplicate account is created.
5. Invalid input (missing email, weak password, malformed email) is caught by Zod validation with specific field-level error messages displayed inline.
6. All user input is sanitized to prevent XSS and injection attacks (NFR11).
7. Auth.js v5 is configured with the Prisma adapter and Credentials provider for email/password login.

## Tasks / Subtasks

- [x] Configure Auth.js v5 with Prisma adapter (AC: #7)
  - [x] Create `src/lib/auth/config.ts` — Auth.js configuration with Prisma adapter, Credentials provider, JWT session strategy
  - [x] Create `src/app/api/auth/[...nextauth]/route.ts` — Auth.js API route handler (GET + POST exports)
  - [x] Credentials provider: look up user by email via `findUserByEmail`, verify password with `bcrypt.compare`, return user object
  - [x] Configure session callbacks to include `user.id` in session/JWT
  - [x] Set `session.strategy: "jwt"` (no server-side session store for MVP)
- [x] Create Zod validation schemas (AC: #5, #6)
  - [x] Create `src/lib/validations/auth.ts` with `registerSchema` — email (valid email, trimmed, lowercased), password (min 8 chars, max 128 chars)
  - [x] Export inferred TypeScript types from schemas
- [x] Create registration API route (AC: #1, #3, #4, #6)
  - [x] Create `src/app/api/v1/auth/register/route.ts` — POST handler
  - [x] Validate request body with `registerSchema`
  - [x] Check for existing user via `findUserByEmail`
  - [x] Hash password with `bcrypt.hash(password, 12)`
  - [x] Create user via `createUser({ email, passwordHash })`
  - [x] Return `{ data: { id, email } }` with 201 status
  - [x] Return 409 with `{ error: { code: "CONFLICT", message: "Email is already registered" } }` for duplicates
  - [x] Return 400 with field-level validation errors for invalid input
- [x] Create registration page and form (AC: #1, #2, #4, #5)
  - [x] Create `src/app/(auth)/layout.tsx` — centered, minimal layout for auth pages
  - [x] Create `src/app/(auth)/register/page.tsx` — server component rendering the registration form
  - [x] Create `src/components/auth/register-form.tsx` — client component with email/password fields, client-side Zod validation, error display, submit handler
  - [x] On submit: POST to `/api/v1/auth/register`, then call `signIn("credentials", { email, password, redirect: false })` from `next-auth/react`
  - [x] On successful sign-in: redirect to dashboard via `router.push`
  - [x] Display server errors (duplicate email, validation) inline
- [x] Add tests (AC: #1-#6)
  - [x] `src/lib/validations/auth.test.ts` — test `registerSchema` validation (valid input, invalid email, short password, missing fields)
  - [x] `src/app/api/v1/auth/register/route.test.ts` — test registration endpoint (success, duplicate, validation error)

## Dev Notes

### Architecture Compliance

- **Auth.js v5 (NextAuth)** — session auth with Prisma adapter. Use JWT strategy (`session.strategy: "jwt"`). The Prisma adapter handles user/account/session persistence. [Source: architecture.md#Session Auth: Auth.js v5]
- **Credentials provider** — Auth.js Credentials provider for email/password. Validate credentials by looking up user in DB and comparing bcrypt hash. Return `null` to reject. [Source: architecture.md#Session Auth: Auth.js v5]
- **bcrypt cost factor 12** — `bcrypt.hash(password, 12)` for registration, `bcrypt.compare(password, hash)` for login verification. [Source: architecture.md#Password Hashing: bcrypt]
- **Zod 4 validation at API boundary** — validate all input in route handlers using schemas from `lib/validations/`. Same schemas used for frontend form validation. [Source: architecture.md#Validation Pattern]
- **Standard API response format** — `{ data }` for success, `{ error: { code, message, details? } }` for errors. Use helpers from `src/lib/api-response.ts`. [Source: architecture.md#API Response Formats]
- **Route groups** — auth pages under `(auth)/` route group. API routes under `api/v1/`. [Source: architecture.md#Routing Strategy]
- **`lib/db/*` is the ONLY Prisma import boundary** — registration route must call `createUser`/`findUserByEmail` from `src/lib/db/users.ts`, never import Prisma directly. [Source: architecture.md#Data Boundaries]

### Technical Requirements

- **Auth.js route handler location**: `src/app/api/auth/[...nextauth]/route.ts` — this is the Auth.js convention (NOT under `/api/v1/`). Auth.js handles its own routing internally.
- **Auth.js config file**: `src/lib/auth/config.ts` — export the `auth`, `signIn`, `signOut` helpers from here. The config uses:
  ```ts
  import { PrismaAdapter } from "@auth/prisma-adapter";
  import { prisma } from "@/lib/db/client";
  import NextAuth from "next-auth";
  import CredentialsProvider from "next-auth/providers/credentials";
  ```
- **Session JWT strategy**: Use `session: { strategy: "jwt" }` — no database sessions for MVP. The JWT is stored in an HTTP-only cookie. Include `user.id` in the JWT via callbacks:
  ```ts
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  }
  ```
- **Client-side auth**: Use `signIn("credentials", { email, password, redirect: false })` from `next-auth/react` to programmatically sign in after registration. Check the response for errors before redirecting.
- **Password validation**: Minimum 8 characters, maximum 128 characters. No complexity requirements for MVP (not in PRD).
- **Email normalization**: Trim whitespace and lowercase the email before storage and lookup to prevent duplicate accounts with different casing.
- **Session expiry**: 24 hours of inactivity (NFR10) — configure `session.maxAge` in Auth.js config.
- **Environment variables already configured**: `AUTH_SECRET` and `AUTH_URL` are already validated in `src/config/env.ts`. No changes needed there.

### File Structure Requirements

Files to create:
- `src/lib/auth/config.ts` — Auth.js v5 configuration (Prisma adapter, Credentials provider, JWT strategy)
- `src/app/api/auth/[...nextauth]/route.ts` — Auth.js route handler (exports GET and POST)
- `src/lib/validations/auth.ts` — Zod schemas for registration (and later login)
- `src/app/api/v1/auth/register/route.ts` — Registration POST endpoint
- `src/app/(auth)/layout.tsx` — Auth pages layout (centered, minimal)
- `src/app/(auth)/register/page.tsx` — Registration page
- `src/components/auth/register-form.tsx` — Registration form client component
- `src/lib/validations/auth.test.ts` — Validation schema tests
- `src/app/api/v1/auth/register/route.test.ts` — Registration route tests

Files to modify:
- None — all new files. Existing `src/lib/db/users.ts` already has `createUser` and `findUserByEmail`.

### Anti-Patterns to Avoid

- Do NOT import `@prisma/client` in auth config or route handlers — use `src/lib/db/users.ts` functions.
- Do NOT use `console.log` — use the structured logger from `src/lib/logger.ts`.
- Do NOT create a custom session store — use JWT strategy (no database sessions table usage for session management).
- Do NOT expose whether an email exists on registration error — wait, this IS the registration flow where we need to tell the user the email is taken. (The "don't reveal email existence" rule applies to login and password reset, not registration.)
- Do NOT store the raw password anywhere — hash immediately with bcrypt before passing to `createUser`.
- Do NOT create API endpoints outside `/api/v1/` except for the Auth.js catch-all at `/api/auth/[...nextauth]` which is required by Auth.js convention.
- Do NOT use `any` type — define proper types for auth callbacks and responses.

### Testing Requirements

- Co-located tests next to source files.
- Test validation schemas with valid and invalid inputs.
- Test registration API route: mock `findUserByEmail` and `createUser` from `src/lib/db/users.ts`, mock `bcrypt.hash`.
- Use Vitest 4 (already configured from Story 1.1).
- Do NOT test Auth.js internals — test the registration route handler and validation schemas.

### Project Structure Notes

- `src/lib/auth/` directory is new — create it. This is the auth configuration boundary.
- `src/lib/validations/` directory is new — create it. Shared Zod schemas live here.
- `src/app/(auth)/` route group is new — create it. All auth pages (register, login, reset-password) go here.
- `src/components/auth/` directory is new — create it. Auth-related UI components live here.
- `src/app/api/auth/[...nextauth]/` — Auth.js catch-all route. This is NOT under `/api/v1/` because Auth.js manages its own routes.
- `src/app/api/v1/auth/register/` — custom registration endpoint under the versioned API.
- The `@/` import alias is already configured — use `@/lib/db/users` for imports.

### Previous Story Intelligence

Story 1.2 established:
- `prisma/schema.prisma` — User model with `id`, `name`, `email` (unique), `emailVerified`, `image`, `passwordHash`, `createdAt`, `updatedAt`. Account, Session, VerificationToken models for Auth.js adapter.
- `src/lib/db/client.ts` — Prisma client singleton with PrismaPg adapter and `globalThis` caching.
- `src/lib/db/users.ts` — exports `findUserByEmail(email)`, `findUserById(id)`, `createUser(data: { email, name?, passwordHash? })`, `updateUser(id, data)`. **Use these functions directly — do NOT create new user query functions.**
- `@auth/prisma-adapter` (v2.11.1) already installed.
- `bcrypt` (v6.0.0) already installed.
- `@types/bcrypt` in devDependencies.
- `prisma.config.ts` at project root for Prisma 7 configuration.

Story 1.2 review feedback: env module was not mocked in tests causing crash — ensure tests that import modules using env handle mocking correctly. Mock `@/config/env` in test setup if needed.

Story 1.1 established:
- Next.js 16.1.6 + TypeScript + Tailwind CSS v4 + App Router + Turbopack
- `src/config/env.ts` — Zod validation (AUTH_SECRET, AUTH_URL, DATABASE_URL, REDIS_URL already included)
- `src/lib/logger.ts` — structured JSON logger
- `src/lib/errors.ts` — `AppError` class
- `src/lib/api-response.ts` — `successResponse(data)` / `errorResponse(error, details?)`
- Vitest 4 configured with co-located tests

### Git Intelligence

Recent commits show the project follows `[BMAD Phase 4] Story X.Y: Title` convention. Files created in Story 1.2: `prisma/schema.prisma`, `prisma/seed.ts`, `prisma.config.ts`, `src/lib/db/client.ts`, `src/lib/db/users.ts`, `src/lib/db/users.test.ts`. The package manager is npm (not pnpm).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Session Auth: Auth.js v5]
- [Source: _bmad-output/planning-artifacts/architecture.md#Password Hashing: bcrypt]
- [Source: _bmad-output/planning-artifacts/architecture.md#Validation Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Response Formats]
- [Source: _bmad-output/planning-artifacts/architecture.md#Routing Strategy]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]
- [Source: _bmad-output/planning-artifacts/prd.md#FR21]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR8]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR11]
- [Source: _bmad-output/implementation-artifacts/1-2-database-schema-and-prisma-setup-for-users.md]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `npm run lint`
- `npm test`
- `npm run build`

### Completion Notes List

- Configured Auth.js v5 beta with Prisma adapter, Credentials provider, JWT session strategy, and `session.user.id` callback propagation.
- Added shared `registerSchema` with email normalization and password length validation for API/client reuse.
- Implemented `/api/v1/auth/register` with Zod validation, bcrypt cost factor 12, duplicate-email handling, and structured API responses.
- Added `(auth)` route group with `/register` page and client registration form that auto-signs in via Auth.js credentials flow.
- Added unit coverage for validation and registration route; lint, tests, and production build pass.
- Standardized the `@/` alias to resolve from `src/` and updated existing imports/tests to match.

### File List

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vitest.config.ts`
- `vitest.setup.ts`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/page.test.tsx`
- `src/app/(auth)/layout.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/v1/auth/register/route.ts`
- `src/app/api/v1/auth/register/route.test.ts`
- `src/components/auth/register-form.tsx`
- `src/lib/api-response.ts`
- `src/lib/api-response.test.ts`
- `src/lib/auth/config.ts`
- `src/lib/errors.test.ts`
- `src/lib/logger.test.ts`
- `src/lib/validations/auth.ts`
- `src/lib/validations/auth.test.ts`
- `src/types/next-auth.d.ts`

### Change Log

- 2026-03-17: Code review by Amelia (claude-opus-4-6). Fixed 6 issues, added 2 tests. Status → done.

## Senior Developer Review (AI)

**Reviewer:** Amelia (claude-opus-4-6)
**Date:** 2026-03-17
**Outcome:** Approved (after fixes applied)

### Issues Found & Fixed

1. **[CRITICAL] Tasks not marked complete** — All `[ ]` checkboxes updated to `[x]`. Story Status updated to "done".
2. **[HIGH] `page.test.tsx:3` wrong mock path** — `vi.mock("@/src/config/env")` → `vi.mock("@/config/env")`. Mock was a no-op due to alias change.
3. **[HIGH] No error logging in registration route** — Added `logger.error("registration.unexpected_error")` before re-throw in catch block.
4. **[MEDIUM] Auth.js authorize coupled to registerSchema** — Created separate `loginSchema` (no max-length constraint) in `auth.ts`, updated `config.ts` to use it.
5. **[MEDIUM] No test for invalid JSON body** — Added test for malformed JSON → 400 response in `route.test.ts`.
6. **[MEDIUM] No test for max password length** — Added test for 129-char password → validation error in `auth.test.ts`.
7. **[MEDIUM] RegisterForm network error unhandled** — Wrapped `onSubmit` body in try/catch, shows user-friendly error on fetch failure. Also removed redundant `values.email.trim().toLowerCase()` (schema transform handles it).

### Verification

- `npm test` — 18 passed, 2 skipped (DB tests, expected without Docker)
- `npm run build` — clean production build
