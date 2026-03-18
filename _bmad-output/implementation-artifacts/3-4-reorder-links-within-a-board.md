# Story 3.4: Reorder Links Within a Board

Status: ready-for-dev

## Story

As a logged-in user,
I want to reorder links within a board,
so that I can arrange my curated collection in the most useful order.

## Acceptance Criteria

1. **Reorder via drag or controls:** Given I own a board with multiple links, when I drag a link to a new position (or use move up/down controls), then the `position` values in `board_links` are updated and the board displays links in the new order.
2. **Persistence:** Given I reorder links, when I refresh the page, then the new order is persisted and displayed correctly.
3. **Ownership enforcement:** Given I try to reorder links on a board I don't own, then I receive a 404 error.
4. **Validation:** Given I submit an invalid reorder payload (missing positions, duplicate positions, non-existent link IDs), then I receive a 400 error with details.

## Tasks / Subtasks

- [ ] Task 1: Add `reorderBoardLinks` database function (AC: #1, #2)
  - [ ] 1.1 Add `reorderBoardLinks(boardId, orderedLinkIds[], db)` to `src/lib/db/board-links.ts` — accepts array of linkIds in desired order, updates each BoardLink's `position` to match array index
  - [ ] 1.2 Wrap position updates in a Prisma transaction for atomicity
  - [ ] 1.3 Unit tests in `src/lib/db/board-links.test.ts`
- [ ] Task 2: Add Zod validation schema for reorder payload (AC: #4)
  - [ ] 2.1 Add `reorderBoardLinksSchema` to `src/lib/validations/board.ts` — validates `{ linkIds: z.array(z.uuid()).min(1) }`
  - [ ] 2.2 Validation tests in `src/lib/validations/board.test.ts`
- [ ] Task 3: API route `PATCH /api/v1/boards/[id]/links/reorder` (AC: #1–#4)
  - [ ] 3.1 New route file: `src/app/api/v1/boards/[id]/links/reorder/route.ts`
  - [ ] 3.2 Auth check → board ownership check (404) → Zod validation (400)
  - [ ] 3.3 Verify all linkIds belong to this board (400 if any are missing/extra)
  - [ ] 3.4 Call `reorderBoardLinks` → return 200 with updated positions
  - [ ] 3.5 Route tests in `src/app/api/v1/boards/[id]/links/reorder/route.test.ts`
- [ ] Task 4: Frontend move up/down controls on board detail page (AC: #1, #2)
  - [ ] 4.1 Add move-up / move-down buttons to each link row in `BoardLinkAdd` component (`src/components/boards/board-link-add.tsx`)
  - [ ] 4.2 On click: swap positions in local state, then PATCH `/api/v1/boards/[id]/links/reorder` with new linkId order
  - [ ] 4.3 Disable move-up on first item, move-down on last item
  - [ ] 4.4 Show loading/disabled state during reorder request
  - [ ] 4.5 On error: revert local state and show error message
- [ ] Task 5: Tests for reorder UI (AC: #1)
  - [ ] 5.1 Component test in `src/components/boards/board-link-add.test.tsx` — move up/down button clicks, disabled states, API call verification

## Dev Notes

### Critical Existing Infrastructure — REUSE, DO NOT RECREATE

**Database layer (`src/lib/db/board-links.ts`):**
- `getNextBoardLinkPosition(boardId, db)` — EXISTS, returns next position integer
- `addLinkToBoard({ boardId, linkId }, db)` — EXISTS, auto-positions at end
- `removeLinkFromBoard(boardId, linkId, db)` — EXISTS
- `recompactBoardLinkPositions(boardId, db)` — EXISTS, reassigns sequential positions after removal
- `getBoardLinksWithMetadata(boardId, db)` — EXISTS, returns links ordered by position
- **ADD:** `reorderBoardLinks(boardId, orderedLinkIds, db)` — new function

**Board queries (`src/lib/db/boards.ts`):**
- `findBoardById(id)` — returns board WITH `boardLinks` including `link` data, ordered by `position`
- `findBoardSummaryById(id)` — board metadata + link count (use for ownership check)
- Ownership pattern: `findFirst({ where: { id, userId } })` or find-then-compare

**Prisma schema (already complete — NO migration needed):**
- `BoardLink` model has `position` (Int) column
- Composite index on `[boardId, position]` for efficient ordering
- Unique constraint on `[boardId, linkId]` prevents duplicates

**Validation (`src/lib/validations/board.ts`):**
- Existing: `createBoardSchema`, `updateBoardSchema`, `addBoardLinkSchema`
- **ADD:** `reorderBoardLinksSchema`

**API response helpers (`src/lib/api-response.ts`):**
- `successResponse(data)`, `errorResponse(error)`, `fieldErrorsFromZod(error)`
- `AppError` class in `src/lib/errors.ts` with `code`, `message`, `statusCode`

### API Endpoint Specification

**PATCH `/api/v1/boards/[id]/links/reorder`**
- New route file: `src/app/api/v1/boards/[id]/links/reorder/route.ts`
- Body: `{ "linkIds": ["<uuid>", "<uuid>", ...] }` — ordered array representing desired order (index 0 = position 0)
- Auth: session required → `auth()` from `@/lib/auth/config`
- Board ownership: `findBoardSummaryById(id)` → 404 if not found or `board.userId !== userId`
- Validation: Zod schema → 400 on invalid
- Link verification: fetch current board links, compare linkIds set — 400 if mismatch (missing or extra IDs)
- Success: 200 `{ data: [{ id, boardId, linkId, position }...] }` — positions in new order
- Use PATCH (not PUT) since it partially updates the board's link ordering

### `reorderBoardLinks` Implementation Guide

```typescript
export async function reorderBoardLinks(
  boardId: string,
  orderedLinkIds: string[],
  db: DbClient = prisma,
) {
  // Use transaction to ensure atomicity
  return db.$transaction(
    orderedLinkIds.map((linkId, index) =>
      db.boardLink.update({
        where: { boardId_linkId: { boardId, linkId } },
        data: { position: index },
      }),
    ),
  );
}
```

Note: Prisma's `$transaction` accepts an array of promises for batch execution. Each update uses the composite unique key `boardId_linkId`.

### Route Handler Pattern — Follow Story 3.3 Exactly

```typescript
// src/app/api/v1/boards/[id]/links/reorder/route.ts
import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { reorderBoardLinksSchema } from "@/lib/validations/board";
import { fieldErrorsFromZod } from "@/lib/validations/utils"; // if exists, else inline
import { findBoardSummaryById } from "@/lib/db/boards";
import { getBoardLinksWithMetadata, reorderBoardLinks } from "@/lib/db/board-links";
import { logger } from "@/lib/logger";
```

Validation steps:
1. Auth check (401 if unauthenticated)
2. Parse JSON body + Zod validation (400 on failure)
3. Board ownership (404 if not found or not owner)
4. Verify linkIds match board's actual links — fetch `getBoardLinksWithMetadata(boardId)`, extract linkIds as a Set, compare against submitted linkIds. Return 400 if sets don't match (prevents orphaning links or injecting links from other boards).
5. Call `reorderBoardLinks(boardId, orderedLinkIds)`
6. Return 200 with updated board links

### Frontend Implementation — Move Up/Down Controls

**Modify `src/components/boards/board-link-add.tsx`:**
- The component already manages `boardLinks` state as `BoardLinkState[]` with `{ id, boardId, linkId, position, addedAt, link }`.
- Add move-up (↑) and move-down (↓) buttons next to each link row, beside the existing "Remove" button.
- On click: swap the clicked item with its neighbor in the local `boardLinks` array, then fire PATCH request.
- Disable up-arrow on position 0, down-arrow on last position.
- After successful PATCH: state already reflects new order. On failure: revert swap.
- Follow existing button styles: `text-zinc-400 hover:text-emerald-300` for icon buttons.

### UI Patterns — FOLLOW ESTABLISHED CONVENTIONS

- Plain HTML + Tailwind CSS (project uses custom components, NOT shadcn/ui library despite architecture doc mentioning it)
- Dark theme: `zinc-900`/`zinc-800` backgrounds, `zinc-100` text, `emerald-400` accents
- Rounded corners: `rounded-2xl` for buttons, `rounded-3xl` for cards
- Hover states: `hover:border-emerald-400/60 hover:text-emerald-300`
- Use `"use client"` directive only for interactive components
- Board detail page is a server component; interactive parts are client components
- Arrow buttons should use simple text arrows (↑ ↓) or SVG icons matching existing style

### Error Code Conventions

- `VALIDATION_ERROR` — 400 (bad input / Zod failure)
- `BAD_REQUEST` — 400 (linkIds don't match board contents)
- `NOT_FOUND` — 404 (board doesn't exist or ownership mismatch)
- `UNAUTHORIZED` — 401 (not authenticated)

### Testing Patterns

- Co-located tests: `route.test.ts` next to `route.ts`
- Component tests: `*.test.tsx` next to component
- DB function tests: extend `board-links.test.ts`
- Use `vi.mock` for Prisma client, auth session
- Mock patterns already established in `src/app/api/v1/boards/[id]/links/route.test.ts` — reuse same mock setup
- Current test baseline: 312 tests passing, 8 skipped (as of Story 3.3)

### Project Structure Notes

- **New files:**
  - `src/app/api/v1/boards/[id]/links/reorder/route.ts`
  - `src/app/api/v1/boards/[id]/links/reorder/route.test.ts`
- **Modified files:**
  - `src/lib/db/board-links.ts` — add `reorderBoardLinks`
  - `src/lib/db/board-links.test.ts` — add reorder tests
  - `src/lib/validations/board.ts` — add `reorderBoardLinksSchema`
  - `src/lib/validations/board.test.ts` — add reorder schema tests
  - `src/components/boards/board-link-add.tsx` — add move up/down buttons
  - `src/components/boards/board-link-add.test.tsx` — add reorder UI tests

### Previous Story Intelligence (from Story 3.3)

- Story 3.3 established the board-link management pattern: API routes at `/api/v1/boards/[id]/links/...`
- `recompactBoardLinkPositions` uses `Promise.all` with individual updates — efficient for small sets (boards typically have <100 links)
- The `BoardLinkAdd` component already manages local position state and recalculates positions on remove (lines 191-197)
- Board detail page (`src/app/(dashboard)/dashboard/boards/[id]/page.tsx`) is a server component that passes data to `BoardLinkAdd` client component
- `npm run build` has a pre-existing Edge runtime issue in `src/lib/logger.ts` — unrelated, do not fix
- `isUniqueConstraintError` helper exists in `src/lib/db/boards.ts` (not needed for reorder, but FYI)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Endpoints — Board-link association]
- [Source: src/lib/db/board-links.ts — existing position management functions]
- [Source: src/components/boards/board-link-add.tsx — existing board link UI with position state]
- [Source: 3-3-add-and-remove-links-from-boards.md — established patterns and dev notes]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
