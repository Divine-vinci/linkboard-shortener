# Story 3.2: Edit and Delete Boards

Status: done

## Story

As a logged-in user,
I want to edit board metadata and delete boards,
So that I can keep my boards up to date or remove ones I no longer need.

## Acceptance Criteria

1. **Given** I own a board **When** I edit the name, description, or visibility **Then** the board is updated and I see a success confirmation **And** changing visibility from public to private immediately restricts access.

2. **Given** I own a board **When** I delete it **Then** the board is permanently removed **And** links that were in the board are NOT deleted — they remain in my link library **And** the `board_links` entries for this board are removed (handled by Prisma `onDelete: Cascade` on `BoardLink.board`).

3. **Given** I try to edit or delete a board I don't own **When** the server processes the request **Then** I receive a 404 error (NFR13: ownership scoping — never reveal existence of other users' resources).

4. **Given** I edit a board name **When** the update is saved **Then** the slug is NOT regenerated (slug is immutable after creation to preserve share URLs).

5. **Given** I submit the edit form with an empty name **When** validation runs **Then** I see a validation error and the board is not updated.

## Tasks / Subtasks

- [x] Task 1: Add Zod validation schema for board updates (AC: #1, #5)
  - [x] 1.1 Add `updateBoardSchema` to `src/lib/validations/board.ts` — partial schema: name (optional string 1-100), description (optional string max 500 or null to clear), visibility (optional enum)
  - [x] 1.2 Add tests for `updateBoardSchema` in `src/lib/validations/board.test.ts`

- [x] Task 2: Add board data access functions (AC: #1, #2, #3, #4)
  - [x] 2.1 Add `updateBoard(id, userId, data)` to `src/lib/db/boards.ts` — find board by id+userId first (ownership check), update fields, return updated board or null
  - [x] 2.2 Add `deleteBoard(id, userId)` to `src/lib/db/boards.ts` — find board by id+userId, delete, return boolean. Prisma `onDelete: Cascade` on BoardLink handles board_links cleanup automatically
  - [x] 2.3 Add tests in `src/lib/db/boards.test.ts`

- [x] Task 3: Create board API endpoints at `src/app/api/v1/boards/[id]/route.ts` (AC: #1, #2, #3, #5)
  - [x] 3.1 GET handler: auth check, find board by id+userId, return `{ data: board }` or 404
  - [x] 3.2 PATCH handler: auth check, Zod validation, call `updateBoard()`, return `{ data: board }` or 404
  - [x] 3.3 DELETE handler: auth check, call `deleteBoard()`, return 204 or 404
  - [x] 3.4 Add tests in `src/app/api/v1/boards/[id]/route.test.ts`

- [x] Task 4: Create board edit form component (AC: #1, #5)
  - [x] 4.1 Create `src/components/boards/board-edit-form.tsx` — pre-populated form with name, description, visibility; PATCH to `/api/v1/boards/{id}`; show success message on save
  - [x] 4.2 Add tests in `src/components/boards/board-edit-form.test.tsx`

- [x] Task 5: Add delete confirmation and handler (AC: #2)
  - [x] 5.1 Add delete button with confirmation dialog to `src/components/boards/board-delete-button.tsx` — DELETE to `/api/v1/boards/{id}`, redirect to `/dashboard/boards` on success
  - [x] 5.2 Add tests in `src/components/boards/board-delete-button.test.tsx`

- [x] Task 6: Create board edit page and update detail page (AC: #1, #2)
  - [x] 6.1 Create `src/app/(dashboard)/dashboard/boards/[id]/edit/page.tsx` — server component loading board data, renders `BoardEditForm`
  - [x] 6.2 Update `src/app/(dashboard)/dashboard/boards/[id]/page.tsx` — add "Edit" link to edit page and delete button

- [x] Task 7: Verify all tests pass and lint is clean
  - [x] 7.1 Run `npm test` — all tests pass
  - [x] 7.2 Run `npm run lint` — no errors

## Dev Notes

### CRITICAL: Existing Board Infrastructure

All board infrastructure already exists from Stories 2.9 and 3.1. **Extend, never recreate.**

**Existing files to EXTEND:**
- `src/lib/db/boards.ts` — has `createBoard`, `findBoardById`, `findBoardBySlug`, `findBoardsByUserId`, `countBoardsByUserId`, slug helpers
- `src/lib/db/boards.test.ts` — has existing tests
- `src/lib/validations/board.ts` — has `createBoardSchema`, `boardListQuerySchema`
- `src/lib/validations/board.test.ts` — has existing tests
- `src/lib/api-response.ts` — has `toBoardResponse()` already (serializes dates to ISO strings)
- `src/app/(dashboard)/dashboard/boards/[id]/page.tsx` — board detail page (add edit/delete controls here)

**Existing patterns to follow exactly:**
- `src/app/api/v1/links/[id]/route.ts` — reference for PATCH + DELETE route pattern (auth check, ownership via find-then-act, 404 for not found/not owned)
- `src/components/boards/board-form.tsx` — reference for form pattern (react-hook-form + zodResolver, fetch to API, router.push/refresh)
- `src/components/boards/board-card.tsx` — reference for Tailwind styling patterns

### Slug Immutability

Slugs must NOT change on edit. Board slugs are used in shareable URLs (`/b/{slug}`). The `updateBoardSchema` must NOT include a `slug` field. The `updateBoard` DB function must NOT modify the slug.

### Cascade Delete Behavior

The Prisma schema has `onDelete: Cascade` on `BoardLink.board` relation. When a board is deleted, all `board_links` rows for that board are automatically removed by the database. Links themselves are NOT deleted (they belong to the `links` table, not cascade-linked through `board_links`). No manual cleanup needed.

### Update Schema Design

The `updateBoardSchema` should use `.partial()` semantics but with explicit optional fields:
- `name`: optional string, 1-100 chars (same constraints as create, but optional)
- `description`: optional — accept string (max 500), null (to clear), or omit (no change)
- `visibility`: optional enum (Public, Private, Unlisted)
- At least one field must be present (use `.refine()` to reject empty updates)

### API Endpoint Specifications

**GET /api/v1/boards/:id**
- Auth: session required
- Success: 200 `{ data: { id, name, slug, description, visibility, createdAt, updatedAt, _count } }`
- Errors: 401 (unauthenticated), 404 (not found or not owned)

**PATCH /api/v1/boards/:id**
- Auth: session required
- Body: `{ name?: string, description?: string | null, visibility?: "Public" | "Private" | "Unlisted" }`
- Success: 200 `{ data: { id, name, slug, description, visibility, createdAt, updatedAt, _count } }`
- Errors: 400 (validation / empty body), 401 (unauthenticated), 404 (not found or not owned)
- Use `toBoardResponse()` from `@/lib/api-response` to serialize

**DELETE /api/v1/boards/:id**
- Auth: session required
- Success: 204 No Content (empty body)
- Errors: 401 (unauthenticated), 404 (not found or not owned)
- Follow exact pattern from `src/app/api/v1/links/[id]/route.ts` DELETE handler

### Data Access Pattern

Follow the same find-then-act pattern used by `updateLink` and `deleteLink` in `src/lib/db/links.ts`:

```typescript
// updateBoard: find by id+userId (ownership check), then update
export async function updateBoard(id: string, userId: string, data: UpdateBoardData, db: DbClient = prisma) {
  const board = await db.board.findFirst({ where: { id, userId } });
  if (!board) return null;
  return db.board.update({ where: { id }, data, include: { _count: { select: { boardLinks: true } } } });
}

// deleteBoard: find by id+userId, then delete
export async function deleteBoard(id: string, userId: string, db: DbClient = prisma): Promise<boolean> {
  const board = await db.board.findFirst({ where: { id, userId } });
  if (!board) return false;
  await db.board.delete({ where: { id } });
  return true;
}
```

Use `findFirst({ where: { id, userId } })` instead of `findUnique` because `userId` is not part of the unique constraint — only `id` and `slug` are unique. This also serves as the ownership check.

### UI Patterns

- **No shadcn/ui** — use plain HTML + Tailwind CSS matching existing component styles
- Form pattern: `"use client"` component, `useForm` from react-hook-form with `zodResolver`, fetch to API, `useRouter` for navigation
- Edit form should be pre-populated with current board values via props
- Delete button: confirm with `window.confirm()` or a simple inline confirmation state (no modal library). Follow the simple pattern — a button that shows "Delete board" → click → shows "Are you sure? Yes / Cancel" inline
- Success feedback: redirect back to board detail after edit, redirect to boards list after delete
- Error display: inline error messages below form fields (same as `board-form.tsx`), toast/alert for API errors

### Architecture Compliance

- **Data access**: Only `lib/db/*` imports Prisma client — never in components or route handlers
- **Validation**: Zod schemas in `lib/validations/board.ts`, shared between API and frontend
- **API responses**: Always `{ data }` or `{ error: { code, message, details? } }` wrapper
- **Auth check**: `auth()` from Auth.js as first operation in every protected route handler
- **Error handling**: Use `AppError` from `lib/errors.ts` for business logic errors
- **Imports**: Use `@/` alias for all project imports
- **Logging**: Use structured logger from `lib/logger.ts`, never `console.log`
- **File naming**: `kebab-case.ts` for lib files, `kebab-case.tsx` for components
- **Component naming**: `PascalCase` exports (`BoardEditForm`, `BoardDeleteButton`)
- **Tests**: Co-located `*.test.ts` / `*.test.tsx` files next to source
- **Route handler signature**: `context: { params: Promise<{ id: string }> }` — params is a Promise in Next.js 15 App Router, must `await context.params`

### Testing Approach

- **Validation tests**: `updateBoardSchema` accepts partial fields, rejects empty update, rejects invalid name length, accepts null description (to clear)
- **DB tests**: `updateBoard` updates fields and returns board, returns null for non-existent, returns null for wrong userId (ownership); `deleteBoard` deletes and returns true, returns false for non-existent/wrong userId
- **API tests**: GET returns board, PATCH updates and returns 200, PATCH with invalid data returns 400, DELETE returns 204, non-existent returns 404, unauthenticated returns 401
- **Component tests**: Edit form renders pre-populated fields, submits PATCH with changed values, shows validation errors; Delete button shows confirmation, calls DELETE, redirects on success
- **Existing test baseline**: 267 tests passing, 8 skipped (from Story 3.1)

### Project Structure Notes

Files to create:
```
src/app/api/v1/boards/[id]/route.ts           # Board CRUD by ID (GET, PATCH, DELETE)
src/app/api/v1/boards/[id]/route.test.ts       # API tests
src/components/boards/board-edit-form.tsx       # Board edit form
src/components/boards/board-edit-form.test.tsx  # Edit form tests
src/components/boards/board-delete-button.tsx   # Delete with confirmation
src/components/boards/board-delete-button.test.tsx
src/app/(dashboard)/dashboard/boards/[id]/edit/page.tsx  # Edit page
```

Files to modify:
```
src/lib/db/boards.ts                           # Add updateBoard(), deleteBoard()
src/lib/db/boards.test.ts                      # Extend with new function tests
src/lib/validations/board.ts                   # Add updateBoardSchema
src/lib/validations/board.test.ts              # Extend with update schema tests
src/app/(dashboard)/dashboard/boards/[id]/page.tsx  # Add edit link + delete button
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3, Story 3.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Board Management FR8-FR15]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Patterns]
- [Source: src/app/api/v1/links/[id]/route.ts — PATCH+DELETE pattern reference]
- [Source: src/components/boards/board-form.tsx — form component pattern reference]
- [Source: src/lib/db/links.ts — updateLink/deleteLink ownership pattern reference]

### Previous Story Intelligence (Story 3.1)

- Board pages live under `(dashboard)/dashboard/boards/` (NOT `(dashboard)/boards/`) — this was a code review fix (H1/H2) to align with middleware auth protection on `/dashboard/*` path
- `toBoardResponse()` in `api-response.ts` handles date serialization with `.toISOString()` — reuse it for PATCH response
- Slug collision handling uses Prisma P2002 error catch — not relevant for edit (no slug changes) but good to know the pattern
- No shadcn/ui — all UI is plain HTML + Tailwind (confirmed multiple times)
- Agent model was gpt-5.4 for Story 3.1; code review by claude-opus-4-6 found 9 issues (3H, 4M, 2L), all fixed
- Post-fix baseline: 267 tests passing, 8 skipped

### Git Intelligence

Recent commits follow pattern: `[BMAD Phase 4] Story X.Y: Description`
- Story 3.1 (latest, 555a9a3) added board creation, list, detail pages, form, validation, slug generation
- Story 2.9 added Board/BoardLink Prisma models, basic board queries, board selector in link creation
- Story 2.6 (7267370) added link delete — pattern reference for DELETE endpoint
- Story 2.5 (3c245f8) added link update — pattern reference for PATCH endpoint
- All stories maintain strict architecture compliance with co-located tests

## Dev Agent Record

### Agent Model Used

gpt-5.4

### Implementation Plan

- Extend `src/lib/validations/board.ts` with `updateBoardSchema`; reject empty PATCH bodies via form-level validation; preserve slug immutability by omitting slug entirely.
- Extend `src/lib/db/boards.ts` with ownership-scoped `updateBoard()` / `deleteBoard()` using `findFirst({ id, userId })` then act.
- Add protected `/api/v1/boards/[id]` GET/PATCH/DELETE handlers using `auth()`, shared validation, `{ data | error }` responses, and 404 ownership masking.
- Add client `BoardEditForm` + `BoardDeleteButton`; wire detail page + new edit page under `/dashboard/boards/[id]/edit`.
- Verify AC1-5 with unit/integration coverage, then full `npm test` + `npm run lint`.

### Debug Log References

- `npm test -- src/lib/validations/board.test.ts src/lib/db/boards.test.ts src/app/api/v1/boards/[id]/route.test.ts src/components/boards/board-edit-form.test.tsx src/components/boards/board-delete-button.test.tsx` (red: failed before implementation; green: passed after implementation)
- `npm test`
- `npm run lint`

### Completion Notes List

- ✅ AC1/AC5 — Added `updateBoardSchema`, shared `_form` Zod error flattening, and pre-populated `BoardEditForm` with inline validation + success redirect.
- ✅ AC1/AC3/AC4 — Added ownership-scoped `updateBoard()` and `/api/v1/boards/[id]` GET/PATCH handlers; slug remains unchanged on update.
- ✅ AC2/AC3 — Added ownership-scoped `deleteBoard()` and DELETE handler returning `204`; board deletion leaves link records intact and relies on `BoardLink.board onDelete: Cascade` for join cleanup.
- ✅ AC1/AC2 — Added edit page and detail-page actions (`Edit board`, inline delete confirmation) under `/dashboard/boards/[id]`.
- ✅ Task 7 — Full suite green: `294 passed, 8 skipped`; lint clean.

### File List

- src/lib/validations/board.ts
- src/lib/validations/board.test.ts
- src/lib/validations/helpers.ts
- src/lib/db/boards.ts
- src/lib/db/boards.test.ts
- src/app/api/v1/boards/[id]/route.ts
- src/app/api/v1/boards/[id]/route.test.ts
- src/components/boards/board-edit-form.tsx
- src/components/boards/board-edit-form.test.tsx
- src/components/boards/board-delete-button.tsx
- src/components/boards/board-delete-button.test.tsx
- src/app/(dashboard)/dashboard/boards/[id]/edit/page.tsx
- src/app/(dashboard)/dashboard/boards/[id]/page.tsx

## Senior Developer Review (AI)

**Reviewer:** Amelia (claude-opus-4-6) on 2026-03-18
**Outcome:** Approved with fixes applied

### Findings (1C, 2H, 3M, 1L)

**Fixed:**
- **C1** — Restored `Prisma` import removed by dev agent in `boards.ts:3`, fixing `TS2503: Cannot find namespace 'Prisma'`
- **H1** — Added `findBoardSummaryById` (no boardLinks eager-load) and switched GET handler to use it, eliminating unnecessary data fetching
- **H2** — Added test for malformed JSON in PATCH handler (`SyntaxError` catch path)

**Acknowledged (not blocking):**
- **M1** — `fieldErrorsFromZod` now propagates `_form` errors to all endpoints; intentional and correct
- **M2** — Edit page still uses `findBoardById` (over-fetches boardLinks); acceptable for server component page load
- **M3** — Network error catch in edit form untested; low risk
- **L1** — Delete button cancel-after-error flow untested; cosmetic

### Post-Review Test Results
- 296 passed, 8 skipped (added 2 new tests)
- Lint clean, no new tsc errors

## Change Log

- 2026-03-18 — Implemented Story 3.2 board edit/delete flow: validation, DB mutations, `/api/v1/boards/[id]` handlers, edit/delete UI, detail/edit page wiring, and AC-mapped tests.
- 2026-03-18 — Code review fixes: restored broken Prisma import (C1), added findBoardSummaryById for lighter API queries (H1), added malformed JSON PATCH test (H2). 296 tests passing.
