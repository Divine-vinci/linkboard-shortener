# Story 1.7: User Profile Management

Status: ready-for-dev

## Story

As a logged-in user,
I want to view and edit my profile information,
so that I can keep my account details up to date.

## Acceptance Criteria

1. **Given** I am logged in and navigate to the settings page, **When** the page loads, **Then** I see my current profile information (name, email, profile image), **And** the page is keyboard-navigable with visible focus indicators (NFR20, NFR22).

2. **Given** I edit my name and submit, **When** the update is processed, **Then** my profile is updated and I see a success confirmation, **And** only I can modify my own profile (NFR13).

3. **Given** I submit invalid profile data, **When** the server validates the input, **Then** Zod validation returns specific field-level error messages.

## Tasks / Subtasks

- [ ] Create profile validation schema (AC: #2, #3)
  - [ ] Add `updateProfileSchema` to `src/lib/validations/profile.ts` — `{ name: z.string().trim().min(1).max(100).optional() }`
  - [ ] Export `UpdateProfileInput` type

- [ ] Create API route: GET `/api/v1/user/profile` (AC: #1)
  - [ ] Create `src/app/api/v1/user/profile/route.ts`
  - [ ] Auth check first via `auth()` — return 401 if not authenticated
  - [ ] Fetch user via `findUserById(session.user.id)`
  - [ ] Return `{ data: { id, name, email, image, createdAt } }` — never expose `passwordHash`
  - [ ] Create `src/app/api/v1/user/profile/route.test.ts`

- [ ] Create API route: PATCH `/api/v1/user/profile` (AC: #2, #3)
  - [ ] Same file `src/app/api/v1/user/profile/route.ts` — add PATCH handler
  - [ ] Auth check first via `auth()` — return 401 if not authenticated
  - [ ] Validate body with `updateProfileSchema`
  - [ ] Call `updateUser(session.user.id, parsed.data)` from `src/lib/db/users.ts`
  - [ ] Return `{ data: { id, name, email, image, createdAt } }` with 200 status
  - [ ] Add PATCH test cases to `src/app/api/v1/user/profile/route.test.ts`

- [ ] Create settings page UI (AC: #1, #2, #3)
  - [ ] Create `src/app/(dashboard)/settings/page.tsx` — server component shell
  - [ ] Create `src/components/settings/profile-form.tsx` — client component
  - [ ] Fetch profile data via GET `/api/v1/user/profile` on mount
  - [ ] Display name (editable input), email (read-only display), image (display only — no upload for MVP)
  - [ ] On submit: PATCH to `/api/v1/user/profile` with updated fields
  - [ ] Show success toast/banner on successful update
  - [ ] Show field-level error messages from Zod validation errors
  - [ ] All form controls keyboard-accessible with visible focus states

- [ ] Add settings navigation link (AC: #1)
  - [ ] Update `src/app/(dashboard)/layout.tsx` — add "Settings" link in the header nav pointing to `/dashboard/settings`

- [ ] Update middleware for settings route protection (AC: #1)
  - [ ] Verify `/dashboard/settings` is already covered by the `/dashboard` prefix in `PROTECTED_ROUTE_PREFIXES` — it is, no middleware change needed

- [ ] Add tests (AC: all)
  - [ ] `src/app/api/v1/user/profile/route.test.ts` — GET returns profile, PATCH updates name, PATCH validates input, 401 for unauthenticated
  - [ ] `src/components/settings/profile-form.test.tsx` — renders form with data, submits update, shows validation errors, shows success message

## Dev Notes

### Architecture Compliance

- **Auth.js v5 session check** — use `auth()` from `@/lib/auth/config` as the FIRST operation in both GET and PATCH handlers. Return 401 `{ error: { code: "UNAUTHORIZED" } }` if no session. [Source: architecture.md#Authentication Flow]
- **PATCH not PUT** — architecture mandates PATCH for all updates (partial update semantics). [Source: architecture.md#API Naming Conventions]
- **API under `/api/v1/`** — route is `/api/v1/user/profile`. [Source: architecture.md#API Naming Conventions]
- **Response format** — always `{ data }` or `{ error }` wrapper. Use `successResponse()` and `errorResponse()` from `src/lib/api-response.ts`. [Source: architecture.md#API Response Formats]
- **Zod at API boundary** — validate with schema, return field-level errors using the `fieldErrorsFromZod()` pattern established in the register route. [Source: architecture.md#Validation Pattern]
- **Data access through `lib/db/`** — use existing `findUserById()` and `updateUser()` from `src/lib/db/users.ts`. Do NOT import Prisma directly. [Source: architecture.md#Data Boundaries]
- **Route handlers are thin** — validate (Zod), call lib functions, format response. No business logic in handlers. [Source: architecture.md#API Boundaries]
- **Structured logging** — use `logger` from `src/lib/logger.ts`, never `console.log`. [Source: architecture.md#Logging Pattern]
- **`@/` import alias** — use for all imports. [Source: architecture.md#Enforcement Guidelines]
- **Co-located tests** — `*.test.ts` next to source files. [Source: architecture.md#Structure Patterns]

### Technical Requirements

- **User model fields** (from `prisma/schema.prisma`):
  ```
  id, name, email, emailVerified, image, passwordHash, createdAt, updatedAt
  ```
  Profile response MUST exclude `passwordHash`. Return: `{ id, name, email, image, createdAt }`.

- **Existing DB functions** — `findUserById(id)` and `updateUser(id, data)` are already in `src/lib/db/users.ts`. `UpdateUserInput` type already allows `name`, `email`, `emailVerified`, `image`, `passwordHash`. For profile updates, only pass `name` to `updateUser()`.

- **NFR13 ownership enforcement** — the PATCH handler gets the user ID from the JWT session (`session.user.id`), not from the request body. This guarantees users can only modify their own profile.

- **MVP scope** — only `name` is editable. Email change and image upload are out of scope. Display email and image as read-only.

- **Settings page path** — architecture specifies `app/(dashboard)/settings/page.tsx` for profile settings (FR25). The `/dashboard` prefix in middleware's `PROTECTED_ROUTE_PREFIXES` already protects this route.

- **No new dependencies needed** — all required libraries (Auth.js, Zod, Prisma) are already installed.

### File Structure Requirements

Files to **create**:
- `src/lib/validations/profile.ts` — `updateProfileSchema`
- `src/lib/validations/profile.test.ts` — schema tests
- `src/app/api/v1/user/profile/route.ts` — GET + PATCH handlers
- `src/app/api/v1/user/profile/route.test.ts` — API tests
- `src/app/(dashboard)/settings/page.tsx` — settings page
- `src/components/settings/profile-form.tsx` — profile edit form component
- `src/components/settings/profile-form.test.tsx` — component tests

Files to **modify**:
- `src/app/(dashboard)/layout.tsx` — add Settings navigation link

### Anti-Patterns to Avoid

- Do NOT expose `passwordHash` in any API response — select/return only safe fields.
- Do NOT accept `id` or `email` in the PATCH body for updating — only `name` is editable. The user ID comes from the session.
- Do NOT create a PUT endpoint — architecture says PATCH only.
- Do NOT create a separate `src/lib/db/profile.ts` — reuse existing `findUserById` and `updateUser` from `src/lib/db/users.ts`.
- Do NOT use `console.log` — use the structured `logger`.
- Do NOT place the settings page outside the `(dashboard)` route group — it must be at `src/app/(dashboard)/settings/page.tsx`.
- Do NOT create a `utils.ts` catch-all file.
- Do NOT use `any` type — use proper types.

### Testing Requirements

- Mock `auth()` from `@/lib/auth/config` in route tests — return `{ user: { id: "test-uuid" } }` for authenticated, `null` for unauthenticated.
- Mock `findUserById` and `updateUser` from `@/lib/db/users` in route tests.
- Test GET returns profile without `passwordHash`.
- Test PATCH updates name and returns updated profile.
- Test PATCH with invalid data returns 400 with field errors.
- Test both GET and PATCH return 401 when not authenticated.
- Test component renders current values, submits form, and shows success/error states.
- Follow vitest + React Testing Library patterns established in prior stories.

### Previous Story Intelligence

**From Story 1.6 (Password Reset):**
- `src/lib/validations/auth.ts` has Zod schemas with `.trim()`, `.min()`, `.max()` — follow same patterns for profile schema.
- Register route `src/app/api/v1/auth/register/route.ts` has the `fieldErrorsFromZod()` pattern — extract to shared utility or copy pattern. Consider moving to `src/lib/api-response.ts` if useful.
- Auth error banner component at `src/components/auth/auth-error-banner.tsx` — can adapt the same success/error feedback pattern for the profile form.
- 56+ tests currently pass via vitest — do not break existing tests.

**From Story 1.5 (OAuth):**
- `src/lib/auth/config.ts` exports `auth` for session checks in server components and route handlers.
- JWT strategy with `token.id` containing the user ID — `session.user.id` is available.
- Dashboard layout at `src/app/(dashboard)/layout.tsx` already shows user email — modify to add Settings link.

**From Story 1.4 (Login & Sessions):**
- Middleware at `src/middleware.ts` protects `/dashboard` prefix — `/dashboard/settings` is automatically protected.
- `PROTECTED_ROUTE_PREFIXES = ["/dashboard"]` uses `startsWith` matching — settings route is covered.

### Git Intelligence

Recent commits follow pattern: `[BMAD Phase 4] Story X.Y: Title`. Files in latest commits:
- Auth-related files follow `src/lib/auth/`, `src/app/api/v1/auth/`, `src/components/auth/` patterns.
- Route tests mock auth and DB functions consistently.
- Component tests use `@testing-library/react` with `render()` and `screen` queries.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Naming Conventions]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Response Formats]
- [Source: _bmad-output/planning-artifacts/architecture.md#Validation Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication Flow]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines]
- [Source: _bmad-output/planning-artifacts/prd.md#FR25]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR13]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR20]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR22]
- [Source: prisma/schema.prisma#User]
- [Source: src/lib/db/users.ts]
- [Source: src/lib/api-response.ts]
- [Source: _bmad-output/implementation-artifacts/1-6-password-reset-via-email.md]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
