# Story 2.2: Custom Slug Support and Validation

Status: done

## Story

As a logged-in user,
I want to specify a custom slug for my short link,
so that I can create branded, memorable URLs.

## Acceptance Criteria

1. **Given** I am creating a new link, **When** I provide a custom slug (e.g., `q2-webinar`), **Then** the short link is created with my chosen slug if it's available, **And** the slug is validated: lowercase alphanumeric + hyphens, 3-50 characters, no leading/trailing hyphens, no consecutive hyphens, no reserved words (NFR15), **And** the API response follows the `{ data: link }` wrapper format.

2. **Given** I provide a custom slug that already exists, **When** I submit the form, **Then** I see a 409 Conflict error: "Custom slug already exists".

3. **Given** I provide a slug using reserved words (e.g., `api`, `admin`, `login`, `b`), **When** the server validates the slug, **Then** I see an error that the slug is reserved and cannot be used.

4. **Given** I leave the custom slug field empty, **When** I submit a valid target URL, **Then** an auto-generated slug is created (existing Story 2.1 behavior preserved).

5. **Given** I am not authenticated, **When** I try to create a link (with or without custom slug), **Then** I receive a 401 error.

## Tasks / Subtasks

- [x] Add custom slug validation schema (AC: #1, #3)
  - [x] Update `src/lib/validations/link.ts` — add `customSlugSchema` (optional): lowercase alphanumeric + hyphens, 3-50 chars, no leading/trailing hyphens, no consecutive hyphens
  - [x] Add reserved slug list constant: `api`, `admin`, `login`, `register`, `dashboard`, `settings`, `b`, `reset-password`, `api-docs`, `health`, `_next`, `favicon.ico`
  - [x] Add `.refine()` to reject reserved slugs
  - [x] Update `createLinkSchema` to include optional `customSlug` field
  - [x] Export `CreateLinkInput` type (updated with customSlug)
  - [x] Update `src/lib/validations/link.test.ts` — test valid custom slugs, reserved word rejection, length bounds, character validation, hyphens rules

- [x] Update API route: POST `/api/v1/links` (AC: #1, #2, #3, #4, #5)
  - [x] Update `src/app/api/v1/links/route.ts`
  - [x] If `customSlug` provided: normalize to lowercase, validate, check uniqueness via `findLinkBySlug`, return 409 if taken
  - [x] If `customSlug` not provided: use existing `generateUniqueSlug()` (preserves Story 2.1 behavior)
  - [x] Return `{ data: { id, slug, targetUrl, userId, createdAt, updatedAt } }` with 201 status
  - [x] Update `src/app/api/v1/links/route.test.ts` — test custom slug creation (201), duplicate slug (409), reserved slug (400), empty slug falls back to auto-generate

- [x] Update link creation form UI (AC: #1, #4)
  - [x] Update `src/components/links/create-link-form.tsx`
  - [x] Add optional "Custom slug" input field below target URL
  - [x] Show slug preview: `{origin}/your-custom-slug` as user types
  - [x] Handle 409 error from API — show "Custom slug already exists" on the slug field
  - [x] All form controls keyboard-accessible with visible focus states
  - [x] Update `src/components/links/create-link-form.test.tsx` — test custom slug input, 409 error display, empty slug submits without customSlug field

## Dev Notes

### Architecture Compliance

- **Auth.js v5 session check** — use `auth()` from `@/lib/auth/config` as FIRST operation in POST handler. Already done in existing route. [Source: architecture.md#Authentication Flow]
- **API under `/api/v1/`** — existing route at `/api/v1/links`. No new routes needed. [Source: architecture.md#API Naming Conventions]
- **Response format** — always `{ data }` or `{ error }` wrapper. Use `successResponse()` and `errorResponse()` from `src/lib/api-response.ts`. [Source: architecture.md#API Response Formats]
- **409 for duplicate slug** — POST returns 409 when custom slug already exists. Use `AppError("CONFLICT", "Custom slug already exists", 409)`. [Source: architecture.md#HTTP Status Codes]
- **Zod at API boundary** — validate with updated `createLinkSchema`, return field-level errors via `fieldErrorsFromZod`. [Source: architecture.md#Validation Pattern]
- **Data access through `lib/db/`** — reuse existing `findLinkBySlug()` from `src/lib/db/links.ts`. No new DB functions needed. [Source: architecture.md#Data Boundaries]
- **Route handlers are thin** — validate, call lib functions, format response. [Source: architecture.md#API Boundaries]
- **Structured logging** — use `logger` from `src/lib/logger.ts`. [Source: architecture.md#Logging Pattern]
- **`@/` import alias** — use for all imports. [Source: architecture.md#Enforcement Guidelines]
- **Co-located tests** — `*.test.ts` next to source files. [Source: architecture.md#Structure Patterns]

### Technical Requirements

- **Custom slug validation rules** (NFR15):
  - Lowercase alphanumeric characters and hyphens only (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`)
  - Length: 3-50 characters
  - No leading or trailing hyphens
  - No consecutive hyphens
  - Not in reserved words list
  - Normalize to lowercase before validation and storage
- **Reserved slugs list** — route prefixes that would conflict with app routes: `api`, `admin`, `login`, `register`, `dashboard`, `settings`, `b` (boards prefix), `reset-password`, `api-docs`, `health`, `_next`, `favicon.ico`. Extract from `src/middleware.ts` matcher config and known route groups `(auth)/`, `(dashboard)/`, `(public)/`.
- **Slug uniqueness** — checked against DB via existing `findLinkBySlug()`. Custom slugs share the same `slug` column as auto-generated slugs — no schema changes needed.
- **Field is optional** — when `customSlug` is undefined/empty string in the request body, fall back to auto-generated slug. The `createLinkSchema` should make `customSlug` an optional field with `.optional().or(z.literal(""))`.
- **No DB migration** — the `slug` column already exists with unique constraint. Custom slugs are stored in the same column.

### File Structure Requirements

Files to **modify**:
- `src/lib/validations/link.ts` — add `customSlugSchema`, reserved words list, update `createLinkSchema`
- `src/lib/validations/link.test.ts` — add custom slug validation tests
- `src/app/api/v1/links/route.ts` — handle custom slug in POST handler
- `src/app/api/v1/links/route.test.ts` — add custom slug API tests
- `src/components/links/create-link-form.tsx` — add optional custom slug input field
- `src/components/links/create-link-form.test.tsx` — add custom slug form tests

Files to **create**: None. This story modifies existing files only.

### Anti-Patterns to Avoid

- Do NOT create a separate API endpoint for custom slugs — extend the existing POST `/api/v1/links` handler.
- Do NOT add a new DB column for custom vs auto-generated — both go in the existing `slug` column.
- Do NOT create a new migration — the schema already supports this.
- Do NOT add title/description/tags fields to the form — that's story 2.3.
- Do NOT add expiration field — that's story 2.4.
- Do NOT implement redirect engine — that's story 2.7.
- Do NOT allow uppercase in custom slugs — normalize to lowercase for case-insensitive URL behavior.
- Do NOT use a separate validation file for slug rules — add to existing `src/lib/validations/link.ts`.
- Do NOT duplicate `fieldErrorsFromZod` — import from `src/lib/validations/helpers.ts` (extracted in Story 2.1 review).
- Do NOT use `console.log` — use the structured `logger`.
- Do NOT use `any` type — use proper types from Prisma and Zod.
- Do NOT validate custom slug in the form only — server-side validation in the route handler is authoritative. Client-side is for UX only.

### Testing Requirements

- Mock `auth()` from `@/lib/auth/config` in route tests.
- Mock `findLinkBySlug` from `@/lib/db/links` in route tests.
- Mock `generateSlug` from `@/lib/slug` in route tests.
- Test custom slug creation returns 201 with `{ data: { slug: "my-custom-slug" } }`.
- Test duplicate custom slug returns 409 with error message.
- Test reserved word slug returns 400 with field error on `customSlug`.
- Test invalid format slug (uppercase, special chars, too short, too long) returns 400.
- Test empty/missing `customSlug` falls back to auto-generated slug (Story 2.1 behavior preserved).
- Test form renders custom slug input field.
- Test form shows 409 error on slug field when duplicate.
- Test form submits without `customSlug` when field is empty.
- Follow vitest + React Testing Library patterns from Story 2.1.
- All existing tests must continue passing.

### Previous Story Intelligence

**From Story 2.1 (Create Short Links):**
- Route handler at `src/app/api/v1/links/route.ts` — extend POST handler, don't replace.
- `generateUniqueSlug()` helper in same file — keep for auto-generated slug fallback.
- `createLink()` in `src/lib/db/links.ts` accepts `{ slug, targetUrl, userId }` — no changes needed, just pass custom slug instead of auto-generated.
- `findLinkBySlug()` already exists — reuse for uniqueness check.
- Form at `src/components/links/create-link-form.tsx` — add custom slug input, keep all existing functionality.
- `createLinkSchema` in `src/lib/validations/link.ts` currently only has `targetUrl` — extend with optional `customSlug`.
- `CreateLinkInput` type auto-inferred from Zod — will update automatically.
- `fieldErrorsFromZod` from `src/lib/validations/helpers.ts` — reuse for field-level errors.
- `AppError` from `src/lib/errors.ts` — reuse for 409 CONFLICT error.
- The form uses `react-hook-form` with `@hookform/resolvers/zod` — adding a field to the schema automatically integrates with form validation.
- `buildShortUrl(slug)` helper in form component — reuse for custom slug preview.

**From Story 2.1 Code Review:**
- `fieldErrorsFromZod` was extracted to `src/lib/validations/helpers.ts` and shared across all route handlers. Use this shared import.
- Clipboard error handling pattern in form — already handles copy failures gracefully.

### Git Intelligence

Recent commits follow pattern: `[BMAD Phase 4] Story X.Y: Title`. Key files from Story 2.1:
- `src/lib/slug.ts` — slug generation (do not modify, custom slugs bypass this)
- `src/lib/validations/link.ts` — extend with custom slug validation
- `src/app/api/v1/links/route.ts` — extend POST handler
- `src/components/links/create-link-form.tsx` — extend with custom slug input
- `src/lib/db/links.ts` — reuse `findLinkBySlug`, no modifications needed
- `src/lib/validations/helpers.ts` — reuse `fieldErrorsFromZod`

### Project Structure Notes

- All modifications stay within existing file locations — no new directories or files.
- Validation stays in `src/lib/validations/link.ts` per architecture validation pattern.
- API route stays at `src/app/api/v1/links/route.ts` per architecture directory structure.
- Form component stays at `src/components/links/create-link-form.tsx` per architecture component organization.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2 Story 2.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Response Formats]
- [Source: _bmad-output/planning-artifacts/architecture.md#HTTP Status Codes]
- [Source: _bmad-output/planning-artifacts/architecture.md#Validation Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication Flow]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries]
- [Source: _bmad-output/planning-artifacts/prd.md#FR2]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR15]
- [Source: _bmad-output/implementation-artifacts/2-1-create-short-links-with-auto-generated-slugs.md]
- [Source: src/lib/validations/link.ts]
- [Source: src/app/api/v1/links/route.ts]
- [Source: src/components/links/create-link-form.tsx]
- [Source: src/lib/db/links.ts]
- [Source: src/lib/validations/helpers.ts]
- [Source: src/lib/api-response.ts]
- [Source: src/lib/errors.ts]
- [Source: src/middleware.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 implementation + GPT-5.4 fallback code review

### Debug Log References

- Fallback review triggered because ACP session `agent:claude:acp:8c36f19e-6336-44b4-9ba5-78dafc177868` produced no transcript output when polled.

### Completion Notes List

- Implemented optional custom slug support in validation, API, and UI.
- Fallback adversarial review fixed whitespace-only slug handling so blank slug input preserves auto-generated behavior.
- Fallback adversarial review hardened auto-generated slug creation against database uniqueness races.
- Added regression tests for whitespace-only custom slug input and insert-time slug race retries.
- Story status and sprint tracking synchronized to done after review fixes.

### File List

- src/lib/validations/link.ts
- src/lib/validations/link.test.ts
- src/app/api/v1/links/route.ts
- src/app/api/v1/links/route.test.ts
- src/components/links/create-link-form.tsx
- src/components/links/create-link-form.test.tsx
- _bmad-output/implementation-artifacts/2-2-code-review.md

### Senior Developer Review (Fallback)

**Reviewer:** GPT-5.4 fallback subagent on 2026-03-17

**Findings Fixed:**
1. **[MEDIUM] Whitespace-only custom slug handling**: `customSlug: "   "` was treated as invalid instead of optional/empty input, breaking AC #4 fallback behavior. Fixed by preprocessing blank/whitespace slug values to `undefined` before validation.
2. **[MEDIUM] Auto-generated slug insert race**: a `P2002` uniqueness collision could still occur after the availability pre-check, returning a misleading custom-slug conflict. Fixed by retrying generated slug creation on insert-time uniqueness races.
3. **[MEDIUM] Story artifact sync gap**: story metadata/file list/status were not review-ready. Synced to done and sprint tracking updated.

**Findings Not Fixed (LOW):**
4. **[LOW] React Compiler lint warning**: `react-hook-form`'s `watch()` usage still triggers the existing `react-hooks/incompatible-library` warning. Non-blocking for correctness and acceptance criteria.

### Change Log

- 2026-03-17: Implementation by dev agent (Claude Opus 4.6)
- 2026-03-17: Fallback code review by GPT-5.4 — fixed whitespace-only slug handling, auto-generated slug race recovery, and BMAD story metadata sync
