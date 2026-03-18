# Story 3.1: Create Boards with Visibility Controls

Status: done

## Story

As a logged-in user,
I want to create a board with a name, description, and visibility setting,
So that I can organize my links into themed, shareable collections.

## Acceptance Criteria

1. **Given** I am logged in **When** I submit the board creation form with a name, optional description, and visibility (public, private, unlisted) **Then** a board is created with `id` (UUID), `name`, `slug` (unique, auto-generated from name), `description`, `visibility` (enum: `Public`, `Private`, `Unlisted`), `user_id`, `created_at`, `updated_at` **And** I am redirected to the new board's detail page.

2. **Given** I set visibility to "private" **When** the board is created **Then** only I can see and access this board.

3. **Given** I set visibility to "public" or "unlisted" **When** the board is created **Then** a shareable board URL is available (e.g., `/b/{board-slug}`).

4. **Given** I submit a board name that generates a slug already in use **When** the server processes the request **Then** the slug is made unique by appending a short random suffix.

5. **Given** I submit the form without a name **When** validation runs **Then** I see a validation error and the board is not created.

## Tasks / Subtasks

- [x] Task 1: Create Zod validation schemas for board creation (AC: #1, #4, #5)
  - [x] 1.1 Create `src/lib/validations/board.ts` with `createBoardSchema` (name: required string 1-100 chars, description: optional string max 500 chars, visibility: enum Public/Private/Unlisted defaulting to Private)
  - [x] 1.2 Add tests in `src/lib/validations/board.test.ts`

- [x] Task 2: Extend board data access layer in `src/lib/db/boards.ts` (AC: #1, #4)
  - [x] 2.1 Add `createBoard()` function — accepts validated input + userId, generates slug from name (slugify), handles uniqueness collision by appending random suffix, creates board via Prisma
  - [x] 2.2 Add `findBoardBySlug()` function for slug uniqueness checks
  - [x] 2.3 Add slug generation helper (lowercase, hyphenated, max 60 chars) — use a simple `slugify` approach (no external library needed: lowercase, replace spaces/special chars with hyphens, trim)
  - [x] 2.4 Add tests in `src/lib/db/boards.test.ts` (extend existing file)

- [x] Task 3: Create board API endpoint `src/app/api/v1/boards/route.ts` (AC: #1, #2, #3, #5)
  - [x] 3.1 POST handler: auth check, Zod validation, call `createBoard()`, return `{ data: board }` with 201 status
  - [x] 3.2 GET handler: auth check, call `findBoardsByUserId()`, return `{ data: boards }` with pagination
  - [x] 3.3 Add tests in `src/app/api/v1/boards/route.test.ts`

- [x] Task 4: Create board form component (AC: #1, #5)
  - [x] 4.1 Create `src/components/boards/board-form.tsx` — form with name input, description textarea, visibility select (Private/Public/Unlisted), submit button
  - [x] 4.2 Client-side Zod validation using same `createBoardSchema`
  - [x] 4.3 POST to `/api/v1/boards`, redirect to board detail on success
  - [x] 4.4 Add tests in `src/components/boards/board-form.test.tsx`

- [x] Task 5: Create board pages (AC: #1, #3)
  - [x] 5.1 Create `src/app/(dashboard)/boards/page.tsx` — boards list page, fetches user boards, displays as cards
  - [x] 5.2 Create `src/components/boards/board-card.tsx` — board display card showing name, description, visibility badge, link count, created date
  - [x] 5.3 Create `src/app/(dashboard)/boards/new/page.tsx` — new board page with `BoardForm`
  - [x] 5.4 Create `src/app/(dashboard)/boards/[id]/page.tsx` — board detail page (placeholder for Story 3.5, but needed as redirect target after creation; show board name, description, visibility, empty link list message)

- [x] Task 6: Verify all tests pass and lint is clean
  - [x] 6.1 Run `npm test` — all tests pass
  - [x] 6.2 Run `npm run lint` — no errors

## Dev Notes

### CRITICAL: Existing Board Infrastructure from Story 2.9

The Prisma schema, migration, and basic data access already exist. **DO NOT recreate or re-migrate these.**

**Already exists (DO NOT recreate):**
- `prisma/schema.prisma` — `Board` model, `BoardLink` model, `BoardVisibility` enum already defined
- `prisma/migrations/20260318031500_add_boards_and_board_links/migration.sql` — already applied
- `src/lib/db/boards.ts` — has `findBoardsByUserId(userId)` and `findBoardById(id)`
- `src/lib/db/boards.test.ts` — has 3 existing tests
- `src/lib/db/board-links.ts` — has `addLinkToBoard()` and `getNextBoardLinkPosition()`
- `src/lib/db/board-links.test.ts` — has 3 existing tests

**You must EXTEND, not replace, the existing files.**

### Slug Generation

Generate board slugs from the board name:
- Lowercase, replace non-alphanumeric with hyphens, collapse consecutive hyphens, trim leading/trailing hyphens
- Max 60 characters
- On uniqueness conflict (Prisma unique constraint error P2002 on `slug`), append `-{4-char-random-hex}` and retry (max 3 attempts)
- No external slugify library needed — implement inline in `lib/db/boards.ts`

### Visibility Behavior

- `Private` (default): Board only visible to owner. No public URL.
- `Public`: Board accessible via `/b/{slug}` to anyone. Listed in owner's boards.
- `Unlisted`: Board accessible via `/b/{slug}` but not discoverable. Share link only.
- Public board rendering (SSR at `/b/[slug]`) is Epic 5 scope. For now, the shareable URL is stored/displayed but the public page itself is not built in this story.

### UI Patterns from Previous Stories

- **No shadcn/ui installed** — use plain HTML elements + Tailwind CSS, matching existing component styles (see `src/components/links/create-link-form.tsx` for reference)
- Form pattern: client component with `"use client"`, useState for form fields, fetch to API endpoint, useRouter for redirects
- Page pattern: server component that fetches data, passes to client components as props
- Error display: inline error messages below form fields, toast/alert for API errors

### Architecture Compliance

- **Data access**: Only `lib/db/*` imports Prisma client directly — never import Prisma in components or route handlers
- **Validation**: Zod schemas in `lib/validations/board.ts`, shared between API and frontend
- **API responses**: Always `{ data }` or `{ error: { code, message, details? } }` wrapper format
- **Auth check**: Use `auth()` from Auth.js as first operation in every protected route handler
- **Error handling**: Use `AppError` class from `lib/errors.ts` for business logic errors
- **Imports**: Use `@/` alias for all project imports; no `../../` paths
- **Logging**: Use structured logger from `lib/logger.ts`, never `console.log`
- **File naming**: `kebab-case.ts` for lib files, `kebab-case.tsx` for components
- **Component naming**: `PascalCase` exports (`BoardForm`, `BoardCard`)
- **Tests**: Co-located `*.test.ts` / `*.test.tsx` files next to source

### API Endpoint Specifications

**POST /api/v1/boards**
- Auth: session required
- Body: `{ name: string, description?: string, visibility?: "Public" | "Private" | "Unlisted" }`
- Success: 201 `{ data: { id, name, slug, description, visibility, createdAt, updatedAt } }`
- Errors: 400 (validation), 401 (unauthenticated)

**GET /api/v1/boards**
- Auth: session required
- Query: `?limit=20&offset=0` (optional)
- Success: 200 `{ data: [...boards], pagination: { total, limit, offset } }`
- Each board includes `_count.boardLinks` for link count display
- Errors: 401 (unauthenticated)

### Testing Approach

- **Validation tests**: Schema accepts valid input, rejects missing name, rejects invalid visibility, applies defaults
- **DB tests**: `createBoard` creates with correct fields, slug generation works, slug collision handling works, `findBoardsByUserId` returns only user's boards
- **API tests**: POST creates board and returns 201, POST with invalid data returns 400, GET returns user's boards with pagination, unauthenticated requests return 401
- **Component tests**: Form renders all fields, form submits with valid data, form shows validation errors, visibility defaults to Private
- **Existing test baseline**: 243 tests passing, 8 skipped (from Story 2.9)

### Project Structure Notes

Files to create:
```
src/lib/validations/board.ts          # Board Zod schemas
src/lib/validations/board.test.ts     # Validation tests
src/app/api/v1/boards/route.ts        # Board API (GET list, POST create)
src/app/api/v1/boards/route.test.ts   # API tests
src/components/boards/board-form.tsx   # Board creation form
src/components/boards/board-form.test.tsx
src/components/boards/board-card.tsx   # Board display card
src/app/(dashboard)/boards/page.tsx   # Boards list page
src/app/(dashboard)/boards/new/page.tsx # Create board page
src/app/(dashboard)/boards/[id]/page.tsx # Board detail page (basic)
```

Files to modify:
```
src/lib/db/boards.ts                  # Add createBoard(), findBoardBySlug(), slug helpers
src/lib/db/boards.test.ts             # Extend with new function tests
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3, Story 3.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Board Management FR8-FR15]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#File Structure]
- [Source: _bmad-output/implementation-artifacts/2-9-create-link-with-board-assignment.md#File List]

### Previous Story Intelligence (Story 2.9)

- Prisma migrate may fail against Supabase due to schema drift — if migration is needed, create SQL manually and regenerate client with `npx prisma generate`
- Transaction logic belongs in route handlers, not in `lib/db/` functions (feedback from code review)
- Board-related models and basic queries already established — follow the same patterns (DbClient type, prisma default parameter)
- Test count baseline: 243 passing, 8 skipped
- No shadcn/ui — all components use plain HTML + Tailwind (confirmed in code review)

### Git Intelligence

Recent commits follow pattern: `[BMAD Phase 4] Story X.Y: Description`
- Story 2.9 (latest) added Board/BoardLink schema, basic board queries, board selector in link creation form
- Story 2.8 added link library with search/filter (pagination patterns reusable)
- Story 2.7 added Redis caching for redirects
- All stories maintain strict architecture compliance with co-located tests

## Dev Agent Record


### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `npm test -- src/lib/validations/board.test.ts src/lib/db/boards.test.ts src/app/api/v1/boards/route.test.ts src/components/boards/board-form.test.tsx`
- `npm test`
- `npm run lint`
- `npm run build` *(fails on pre-existing Edge runtime incompatibility in `src/lib/logger.ts` via `process.stdout.write`)*

### Completion Notes List

- Implemented board validation, board creation/list API, dashboard board pages, and board creation form with visibility controls.
- Extended board data access with slug generation, uniqueness retries, board counts, and slug lookup.
- Added board cards and placeholder board detail page as the post-create redirect target.
- Updated dashboard navigation to expose the new Boards area.
- Validation complete: 264 tests passing, 8 skipped; lint passes.
- Story status moved to `review`; sprint tracking updated accordingly.

### File List

Files created:
- `src/lib/validations/board.ts`
- `src/lib/validations/board.test.ts`
- `src/app/api/v1/boards/route.ts`
- `src/app/api/v1/boards/route.test.ts`
- `src/components/boards/board-form.tsx`
- `src/components/boards/board-form.test.tsx`
- `src/components/boards/board-card.tsx`
- `src/app/(dashboard)/dashboard/boards/page.tsx`
- `src/app/(dashboard)/dashboard/boards/new/page.tsx`
- `src/app/(dashboard)/dashboard/boards/[id]/page.tsx`

Files modified:
- `src/lib/db/boards.ts`
- `src/lib/db/boards.test.ts`
- `src/lib/api-response.ts`
- `src/app/(dashboard)/layout.tsx`

### Code Review Record

**Reviewer:** claude-opus-4-6
**Date:** 2026-03-18
**Issues Found:** 3 High, 4 Medium, 2 Low
**Issues Fixed:** 7 (all HIGH and MEDIUM)

**Fixes applied:**
- H1: Moved board pages from `(dashboard)/boards/` to `(dashboard)/dashboard/boards/` so URLs serve at `/dashboard/boards/*` matching nav convention and middleware auth protection
- H2: Fixed by H1 — board pages now under `/dashboard/*` path protected by auth middleware
- H3: Replaced "Story 3.1" hardcoded text with "New board" in new board page header
- L1: Replaced "Story 3.5" reference with generic "coming soon" text in board detail placeholder
- M1: Removed TOCTOU pre-check in `createBoard` — now relies solely on P2002 catch-and-retry (race-safe)
- M2: Added explicit `.toISOString()` date serialization in `toBoardResponse` for consistency with `toLinkResponse`
- M3: Added `redirect("/login")` guard to boards list server component for unauthenticated users
- M4: Added test for exhausted retry attempts (throws after 3 P2002 collisions)
- L2: Added boundary tests for name > 100 chars and description > 500 chars

**Post-fix validation:** 267 tests passing, 8 skipped; lint clean
