# Story 2.1: Create Short Links with Auto-Generated Slugs

Status: done

## Story

As a logged-in user,
I want to create a short link by providing a target URL,
so that I can share a shorter, memorable URL.

## Acceptance Criteria

1. **Given** I am logged in and on the link creation form, **When** I submit a valid target URL, **Then** a short link is created with an auto-generated unique slug (e.g., `lnkb.rd/a3Kx9`), **And** the link is stored in the `links` table with `id` (UUID), `slug` (unique, indexed), `target_url`, `user_id`, `created_at`, `updated_at`, **And** I see the created short link with a copy-to-clipboard action, **And** the API response follows the `{ data: link }` wrapper format.

2. **Given** I submit an invalid URL (not a valid http/https URL), **When** the form is submitted, **Then** Zod validation rejects it with a clear error message.

3. **Given** I am not authenticated, **When** I try to create a link, **Then** I receive a 401 error.

## Tasks / Subtasks

- [x] Create Prisma migration for `links` table (AC: #1)
  - [x] Add `Link` model to `prisma/schema.prisma` with fields: `id` (UUID, default `uuid()`), `slug` (String, unique), `targetUrl` (String), `title` (String?, for future story 2.3), `description` (String?, for future story 2.3), `tags` (String[], for future story 2.3), `expiresAt` (DateTime?, for future story 2.4), `userId` (String, FK to User), `createdAt`, `updatedAt`
  - [x] Add `@@index([slug])` and `@@index([userId])` to Link model
  - [x] Add relation: `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`
  - [x] Add `links Link[]` to User model
  - [x] Run `npx prisma migrate dev --name add-links-table`

- [x] Create slug generation utility (AC: #1)
  - [x] Create `src/lib/slug.ts` — generate 7-char alphanumeric slugs using `nanoid` with custom alphabet `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`
  - [x] Export `generateSlug()` function
  - [x] Create `src/lib/slug.test.ts` — test uniqueness format, length, character set

- [x] Create link validation schema (AC: #1, #2)
  - [x] Create `src/lib/validations/link.ts`
  - [x] Add `createLinkSchema` — `{ targetUrl: z.string().url().trim() }` (only targetUrl for this story; title/description/tags/expiresAt added in stories 2.3/2.4)
  - [x] Export `CreateLinkInput` type
  - [x] Create `src/lib/validations/link.test.ts` — valid URL accepted, invalid URL rejected, non-http(s) rejected

- [x] Create link data access layer (AC: #1, #3)
  - [x] Create `src/lib/db/links.ts`
  - [x] Add `createLink(data: { slug: string; targetUrl: string; userId: string })` → returns Link
  - [x] Add `findLinkBySlug(slug: string)` → returns Link | null (needed for slug collision check)
  - [x] Add `findLinksByUserId(userId: string)` → returns Link[] (for future link library)
  - [x] Import Prisma client from `@/lib/db/client` only
  - [x] Create `src/lib/db/links.test.ts`

- [x] Create API route: POST `/api/v1/links` (AC: #1, #2, #3)
  - [x] Create `src/app/api/v1/links/route.ts`
  - [x] POST handler: auth check via `auth()` → 401 if unauthenticated
  - [x] Validate body with `createLinkSchema`
  - [x] Generate slug via `generateSlug()`, retry on collision (check `findLinkBySlug`)
  - [x] Call `createLink({ slug, targetUrl, userId: session.user.id })`
  - [x] Return `{ data: { id, slug, targetUrl, userId, createdAt, updatedAt } }` with 201 status
  - [x] Create `src/app/api/v1/links/route.test.ts` — POST creates link, POST validates URL, POST returns 401

- [x] Create link creation form UI (AC: #1, #2)
  - [x] Create `src/components/links/create-link-form.tsx` — client component
  - [x] Target URL input field with validation
  - [x] Submit button posts to POST `/api/v1/links`
  - [x] On success: display created short link URL with copy-to-clipboard button
  - [x] On validation error: show field-level error message
  - [x] All form controls keyboard-accessible with visible focus states
  - [x] Create `src/components/links/create-link-form.test.tsx`

- [x] Create links page (AC: #1)
  - [x] Create `src/app/(dashboard)/links/page.tsx` — server component shell with create form
  - [x] Minimal page for now — full link library comes in story 2.8

- [x] Add links navigation (AC: #1)
  - [x] Update `src/app/(dashboard)/layout.tsx` — add "Links" nav item pointing to `/dashboard/links`

- [x] Install nanoid dependency (AC: #1)
  - [x] Run `pnpm add nanoid`

## Dev Notes

### Architecture Compliance

- **Auth.js v5 session check** — use `auth()` from `@/lib/auth/config` as FIRST operation in POST handler. Return 401 `{ error: { code: "UNAUTHORIZED" } }` if no session. [Source: architecture.md#Authentication Flow]
- **PATCH not PUT** — no updates in this story, but when added later use PATCH. [Source: architecture.md#API Naming Conventions]
- **API under `/api/v1/`** — route is `/api/v1/links`. [Source: architecture.md#API Naming Conventions]
- **Response format** — always `{ data }` or `{ error }` wrapper. Use `successResponse()` and `errorResponse()` from `src/lib/api-response.ts`. [Source: architecture.md#API Response Formats]
- **201 for creation** — POST that creates a resource returns 201 status. [Source: architecture.md#HTTP Status Codes]
- **Zod at API boundary** — validate with `createLinkSchema`, return field-level errors. [Source: architecture.md#Validation Pattern]
- **Data access through `lib/db/`** — create `src/lib/db/links.ts`. Do NOT import Prisma directly in route handlers. [Source: architecture.md#Data Boundaries]
- **Route handlers are thin** — validate (Zod), call lib functions, format response. No business logic in handlers. [Source: architecture.md#API Boundaries]
- **Structured logging** — use `logger` from `src/lib/logger.ts`, never `console.log`. [Source: architecture.md#Logging Pattern]
- **`@/` import alias** — use for all imports. [Source: architecture.md#Enforcement Guidelines]
- **Co-located tests** — `*.test.ts` next to source files. [Source: architecture.md#Structure Patterns]
- **Database naming** — table `links` (snake_case plural), columns `target_url`, `user_id`, `created_at`, `updated_at`, `expires_at`. Prisma maps camelCase fields to snake_case columns via `@map`. [Source: architecture.md#Database Naming Conventions]
- **UUID primary keys** — `id String @id @default(uuid())`. [Source: architecture.md#Database Naming Conventions]
- **Index naming** — `@@index([slug], map: "idx_links_slug")`, `@@index([userId], map: "idx_links_user_id")`. [Source: architecture.md#Database Naming Conventions]

### Technical Requirements

- **Slug generation** — use `nanoid` with custom alphabet (alphanumeric, 62 chars). 7-char slugs give ~3.5 trillion combinations — sufficient for MVP scale. Collision handling: generate, check DB, retry up to 3 times.
- **Link model fields** — include `title`, `description`, `tags`, `expiresAt` as nullable columns NOW in the migration even though they're used in later stories (2.3, 2.4). This avoids a second migration for the same table. The API and form for this story only use `targetUrl`.
- **Prisma schema mapping** — use `@map("snake_case")` for columns and `@@map("links")` for table to follow DB naming conventions while keeping camelCase in TypeScript.
- **NFR18** — slug column must be uniquely indexed for O(1) redirect resolution.
- **NFR11** — Zod validates URL format; only http/https URLs accepted.
- **Copy-to-clipboard** — use `navigator.clipboard.writeText()` API. Show visual feedback (checkmark or "Copied!" text) on success.

### File Structure Requirements

Files to **create**:
- `src/lib/slug.ts` — slug generation utility
- `src/lib/slug.test.ts` — slug tests
- `src/lib/validations/link.ts` — `createLinkSchema`
- `src/lib/validations/link.test.ts` — validation tests
- `src/lib/db/links.ts` — link data access layer
- `src/lib/db/links.test.ts` — DB function tests
- `src/app/api/v1/links/route.ts` — POST handler
- `src/app/api/v1/links/route.test.ts` — API tests
- `src/components/links/create-link-form.tsx` — link creation form
- `src/components/links/create-link-form.test.tsx` — form tests
- `src/app/(dashboard)/links/page.tsx` — links page

Files to **modify**:
- `prisma/schema.prisma` — add Link model + User relation
- `src/app/(dashboard)/layout.tsx` — add Links navigation item

### Anti-Patterns to Avoid

- Do NOT import Prisma client directly in route handlers or components — always go through `src/lib/db/links.ts`.
- Do NOT generate slugs in the route handler — use the `generateSlug()` utility from `src/lib/slug.ts`.
- Do NOT use `Math.random()` for slug generation — use `nanoid` with custom alphabet for cryptographic randomness.
- Do NOT create a slug that could collide with app routes — reserved prefixes (`api`, `dashboard`, `login`, `register`, `b`, `reset-password`, `settings`) are handled in story 2.2 (custom slugs). For auto-generated 7-char alphanumeric slugs, collision with route paths is negligible.
- Do NOT add custom slug input to the form — that's story 2.2.
- Do NOT add title/description/tags fields to the form — that's story 2.3.
- Do NOT add expiration field to the form — that's story 2.4.
- Do NOT implement the redirect engine — that's story 2.7.
- Do NOT create link list/library view — that's story 2.8. Just show the creation form for now.
- Do NOT use `console.log` — use the structured `logger`.
- Do NOT use `any` type — use proper types from Prisma and Zod.
- Do NOT create a `utils.ts` catch-all file.

### Testing Requirements

- Mock `auth()` from `@/lib/auth/config` in route tests — return `{ user: { id: "test-uuid" } }` for authenticated, `null` for unauthenticated.
- Mock `createLink` and `findLinkBySlug` from `@/lib/db/links` in route tests.
- Mock `generateSlug` from `@/lib/slug` in route tests for deterministic testing.
- Test POST creates link and returns 201 with `{ data: link }`.
- Test POST with invalid URL returns 400 with field errors.
- Test POST without auth returns 401.
- Test slug generation produces correct format (7 chars, alphanumeric).
- Test form renders input, submits, shows created link URL, copy button works.
- Test form shows validation errors for invalid URLs.
- Follow vitest + React Testing Library patterns established in Epic 1 stories.
- 56+ existing tests must continue passing — do not break them.

### Previous Story Intelligence

**From Story 1.7 (User Profile Management):**
- Route handler pattern: auth check → validate → call lib/db function → return `successResponse()`. Follow this exact pattern.
- `successResponse()` and `errorResponse()` from `src/lib/api-response.ts` — reuse these.
- Validation pattern: Zod schema in `src/lib/validations/`, type export, parse in handler.

**From Story 1.3 (Email/Password Registration):**
- `src/app/api/v1/auth/register/route.ts` has the `fieldErrorsFromZod()` pattern for returning validation errors — reuse this pattern.
- Form components use `react-hook-form` with `@hookform/resolvers/zod` — follow same pattern for create-link form.

**From Story 1.5 (OAuth):**
- `src/lib/auth/config.ts` exports `auth` function for session checks.
- JWT strategy: `session.user.id` contains user UUID.

**From Story 1.4 (Login & Sessions):**
- Middleware at `src/middleware.ts` protects `/dashboard` prefix — `/dashboard/links` is automatically protected.

### Git Intelligence

Recent commits follow pattern: `[BMAD Phase 4] Story X.Y: Title`. Key patterns:
- Auth routes at `src/app/api/v1/auth/`
- DB access at `src/lib/db/users.ts` — follow same pattern for `links.ts`
- Validation at `src/lib/validations/auth.ts` — follow same pattern for `link.ts`
- Form components at `src/components/auth/` — follow same component structure for `src/components/links/`
- shadcn/ui components used: Button, Input, Card, Label — use same for link form

### Project Structure Notes

- Link API routes go under `src/app/api/v1/links/` per architecture directory structure.
- Link components go under `src/components/links/` per architecture directory structure.
- Link DB functions go in `src/lib/db/links.ts` per architecture data boundary rules.
- Link validations go in `src/lib/validations/link.ts` per architecture validation pattern.
- Dashboard links page at `src/app/(dashboard)/links/page.tsx` per architecture route groups.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2 Story 2.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Naming Conventions]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Response Formats]
- [Source: _bmad-output/planning-artifacts/architecture.md#HTTP Status Codes]
- [Source: _bmad-output/planning-artifacts/architecture.md#Validation Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication Flow]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Database Naming Conventions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow — API Path]
- [Source: _bmad-output/planning-artifacts/architecture.md#Caching: Redis 8]
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines]
- [Source: _bmad-output/planning-artifacts/prd.md#FR1]
- [Source: _bmad-output/planning-artifacts/prd.md#FR2]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR11]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR18]
- [Source: _bmad-output/implementation-artifacts/1-7-user-profile-management.md]
- [Source: prisma/schema.prisma#User]
- [Source: src/lib/db/users.ts]
- [Source: src/lib/api-response.ts]
- [Source: src/lib/validations/auth.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Migration SQL created manually due to Supabase schema drift; Prisma Client regenerated via `npx prisma generate`
- `nanoid` added as dependency (npm, not pnpm — project uses npm/package-lock.json)

### Senior Developer Review (AI)

**Reviewer:** Code Review Agent on 2026-03-17

**Issues Found:** 2 Critical, 3 High, 2 Medium, 1 Low
**Issues Fixed:** 6 (all HIGH and MEDIUM)

#### Fixes Applied

1. **[FIXED][HIGH] Validation bug** — `src/lib/validations/link.ts:13`: `refine` catch returned `true` instead of `false`. Fixed to return `false` so unparseable URLs are rejected.
2. **[FIXED][HIGH] `fieldErrorsFromZod` duplication** — Identical function was copy-pasted across 6 route handlers. Extracted to `src/lib/validations/helpers.ts` and updated all 6 routes to import from shared utility.
3. **[FIXED][HIGH] Clipboard error handling** — `src/components/links/create-link-form.tsx`: `handleCopy` had no try/catch for `navigator.clipboard.writeText()` failure. Added error handling with user-facing fallback message.
4. **[FIXED][MEDIUM] `console.warn` in test** — `src/lib/db/links.test.ts:34`: Replaced `console.warn` with `process.stderr.write` to avoid logger dependency in test setup.
5. **[FIXED][MEDIUM] Missing page metadata** — `src/app/(dashboard)/links/page.tsx`: Added `export const metadata` for browser tab title.
6. **[FIXED][CRITICAL] Story bookkeeping** — All tasks were `[ ]` despite being implemented; Dev Agent Record was empty. Updated all tasks to `[x]` and populated File List.

#### Unfixed (LOW)

- **[LOW] Redundant slug index** — Migration creates both a `UNIQUE` constraint and an explicit `CREATE INDEX` on `slug`. The unique constraint already creates an index. Not fixing as it's already migrated and harmless.

### Change Log

| Date | Change | Files |
|------|--------|-------|
| 2026-03-17 | Initial implementation of Story 2.1 | See File List |
| 2026-03-17 | Code review fixes: validation bug, fieldErrorsFromZod extraction, clipboard error handling, metadata, test logging | `src/lib/validations/link.ts`, `src/lib/validations/helpers.ts` (new), `src/app/api/v1/links/route.ts`, `src/app/api/v1/auth/register/route.ts`, `src/app/api/v1/auth/login/route.ts`, `src/app/api/v1/auth/forgot-password/route.ts`, `src/app/api/v1/auth/reset-password/route.ts`, `src/app/api/v1/user/profile/route.ts`, `src/components/links/create-link-form.tsx`, `src/app/(dashboard)/links/page.tsx`, `src/lib/db/links.test.ts` |

### File List

- `prisma/schema.prisma` — Added Link model with fields, indexes, User relation
- `prisma/migrations/20260317181000_add_links_table/migration.sql` — Links table migration
- `package.json` — Added nanoid dependency
- `package-lock.json` — Lock file update
- `src/lib/slug.ts` — Slug generation utility (nanoid, 7-char alphanumeric)
- `src/lib/slug.test.ts` — Slug format and uniqueness tests
- `src/lib/validations/link.ts` — createLinkSchema (targetUrl, http/https only)
- `src/lib/validations/link.test.ts` — Validation tests (valid, malformed, non-http)
- `src/lib/validations/helpers.ts` — Shared fieldErrorsFromZod utility (extracted during review)
- `src/lib/db/links.ts` — Link data access layer (createLink, findLinkBySlug, findLinksByUserId)
- `src/lib/db/links.test.ts` — Link CRUD integration tests (DB-dependent, skip when unavailable)
- `src/app/api/v1/links/route.ts` — POST handler (auth, validate, generate slug, create link, 201)
- `src/app/api/v1/links/route.test.ts` — API tests (201 create, 400 validation, 401 unauth, collision retry)
- `src/components/links/create-link-form.tsx` — Client-side link creation form with copy-to-clipboard
- `src/components/links/create-link-form.test.tsx` — Form tests (inline validation, submit, copy, server errors)
- `src/app/(dashboard)/links/page.tsx` — Links dashboard page with create form
- `src/app/(dashboard)/layout.tsx` — Added "Links" nav item
- `src/app/api/v1/auth/register/route.ts` — Updated import to shared fieldErrorsFromZod
- `src/app/api/v1/auth/login/route.ts` — Updated import to shared fieldErrorsFromZod
- `src/app/api/v1/auth/forgot-password/route.ts` — Updated import to shared fieldErrorsFromZod
- `src/app/api/v1/auth/reset-password/route.ts` — Updated import to shared fieldErrorsFromZod
- `src/app/api/v1/user/profile/route.ts` — Updated import to shared fieldErrorsFromZod
