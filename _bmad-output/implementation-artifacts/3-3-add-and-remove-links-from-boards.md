# Story 3.3: Add and Remove Links from Boards

Status: ready-for-dev

## Story

As a logged-in user,
I want to add existing links to a board and remove them,
so that I can curate link collections without affecting the links themselves.

## Acceptance Criteria

1. **Add link to board:** Given I own a board and have links in my library, when I add a link to the board, then a `board_links` entry is created and the link appears at the last position.
2. **Remove link from board:** Given I remove a link from a board, then the `board_links` entry is removed, the link still exists in my library (FR12), and remaining links' positions are recomputed to eliminate gaps.
3. **Ownership enforcement:** Given I try to add a link to a board I don't own, then I receive a 404 error (NFR13).
4. **Duplicate prevention:** Given I try to add the same link to a board twice, then I receive a 409 Conflict error.

## Tasks / Subtasks

- [ ] Task 1: Add `removeLinkFromBoard` and `getBoardLinksWithMetadata` to board-links data access (AC: #2)
  - [ ] 1.1 `removeLinkFromBoard(boardId, linkId, db)` — deletes BoardLink row
  - [ ] 1.2 `recompactBoardLinkPositions(boardId, db)` — reassigns sequential positions after removal
  - [ ] 1.3 Unit tests for both functions
- [ ] Task 2: Zod validation schemas for board-link operations (AC: #1, #4)
  - [ ] 2.1 `addBoardLinkSchema` — validates `linkId` (UUID)
  - [ ] 2.2 Validation tests
- [ ] Task 3: API route `POST /api/v1/boards/[id]/links` — add link to board (AC: #1, #3, #4)
  - [ ] 3.1 Auth check, board ownership check (404 if not owner)
  - [ ] 3.2 Validate linkId, verify link ownership
  - [ ] 3.3 Call `addLinkToBoard` — catch unique constraint → 409 Conflict
  - [ ] 3.4 Return 201 with board-link data
- [ ] Task 4: API route `DELETE /api/v1/boards/[id]/links/[linkId]` — remove link from board (AC: #2, #3)
  - [ ] 4.1 Auth check, board ownership check (404 if not owner)
  - [ ] 4.2 Find and delete the BoardLink row (404 if not found)
  - [ ] 4.3 Recompact positions after removal
  - [ ] 4.4 Return 204
- [ ] Task 5: API route tests for both endpoints (AC: #1–#4)
  - [ ] 5.1 POST success, duplicate 409, non-owner 404, link not found 400, missing body 400
  - [ ] 5.2 DELETE success, non-owner 404, link not on board 404
- [ ] Task 6: Board detail page — display links and management UI (AC: #1, #2)
  - [ ] 6.1 Replace placeholder in `boards/[id]/page.tsx` with link list (title/slug, targetUrl, tags)
  - [ ] 6.2 "Add link" button/form — dropdown or search of user's links not already on this board
  - [ ] 6.3 "Remove" button per link with confirmation
  - [ ] 6.4 Client-side fetch calls to POST/DELETE endpoints with optimistic UI or reload
- [ ] Task 7: Component tests for board link management UI (AC: #1, #2)
  - [ ] 7.1 Renders link list from board data
  - [ ] 7.2 Add link form submission
  - [ ] 7.3 Remove button triggers delete

## Dev Notes

### Critical Existing Infrastructure — REUSE, DO NOT RECREATE

**Database layer (extend `src/lib/db/board-links.ts`):**
- `addLinkToBoard({ boardId, linkId }, db)` — ALREADY EXISTS, auto-positions via `getNextBoardLinkPosition`
- `getNextBoardLinkPosition(boardId, db)` — ALREADY EXISTS
- Add: `removeLinkFromBoard`, `recompactBoardLinkPositions`

**Board queries (`src/lib/db/boards.ts`):**
- `findBoardById(id)` — ALREADY returns full board WITH `boardLinks` including `link` data, ordered by `position`
- `findBoardSummaryById(id)` — board metadata + link count only
- Ownership pattern: find-then-act (`findFirst({ where: { id, userId } })`)

**Prisma schema (already complete):**
- `BoardLink` model: `boardId`, `linkId`, `position`, `addedAt`
- Unique constraint on `[boardId, linkId]` — Prisma throws `P2002` on duplicate
- Cascade delete on both `board` and `link` relations
- Composite index on `[boardId, position]` for efficient ordering

**Validation (`src/lib/validations/board.ts`):**
- Extend with `addBoardLinkSchema` for the POST body

**API response helpers (`src/lib/api-response.ts`):**
- `toLinkResponse(link)`, `toBoardResponse(board)`, `successResponse(data)`, `errorResponse(error)`
- `AppError` class in `src/lib/errors.ts` with `code`, `message`, `statusCode`

**Link queries (`src/lib/db/links.ts`):**
- `findLinkById(id)` — use to verify link exists and user owns it

### API Endpoint Specifications

**POST `/api/v1/boards/[id]/links`**
- New route file: `src/app/api/v1/boards/[id]/links/route.ts`
- Body: `{ "linkId": "<uuid>" }`
- Auth: session required → `auth()` from `@/lib/auth/config`
- Board ownership: `findBoardSummaryById(id)` → 404 if not found or `board.userId !== userId`
- Link ownership: `findLinkById(linkId)` → 400 if not found or `link.userId !== userId`
- Duplicate: catch Prisma `P2002` error → 409 `{ error: { code: "CONFLICT", message: "Link is already on this board" } }`
- Success: 201 `{ data: { id, boardId, linkId, position, addedAt } }`

**DELETE `/api/v1/boards/[id]/links/[linkId]/route.ts`**
- New route file: `src/app/api/v1/boards/[id]/links/[linkId]/route.ts`
- Auth: session required
- Board ownership: `findBoardSummaryById(id)` → 404 if not found or not owner
- Find BoardLink: `prisma.boardLink.findUnique({ where: { boardId_linkId: { boardId, linkId } } })` → 404 if not on board
- Delete + recompact positions
- Success: 204 (no body)

### Board Detail Page UI Updates

**File: `src/app/(dashboard)/dashboard/boards/[id]/page.tsx`**
- `findBoardById` already returns `board.boardLinks[].link` with full link data — USE THIS
- Replace the dashed-border placeholder div (lines 77-85) with actual link list
- Each link row: title (or slug fallback), targetUrl (truncated), tags, remove button
- "Add link to board" button that opens a picker/dropdown

**Add-link component: `src/components/boards/board-link-add.tsx`**
- Fetch user's links via existing `GET /api/v1/links` endpoint
- Filter out links already on the board (compare against `board.boardLinks[].linkId`)
- Submit selected linkId to `POST /api/v1/boards/[id]/links`

**Remove-link component: inline button in link row**
- Calls `DELETE /api/v1/boards/[id]/links/[linkId]`
- On success: remove from displayed list (or reload page via `router.refresh()`)

### UI Patterns — FOLLOW ESTABLISHED CONVENTIONS

- Plain HTML + Tailwind CSS (no shadcn/ui components used in this project)
- Dark theme: zinc-900/zinc-800 backgrounds, zinc-100 text, emerald-400 accents
- Rounded corners: `rounded-2xl` for buttons, `rounded-3xl` for cards
- Hover states: `hover:border-emerald-400/60 hover:text-emerald-300`
- Use `"use client"` directive only for interactive components, not the page itself
- The page is a server component; interactive parts (add/remove) are client components

### Position Recompaction Strategy

After removing a link, positions may have gaps (e.g., 0, 1, 3). Recompact by:
1. Query all remaining BoardLinks for the board, ordered by position
2. Update each with sequential positions (0, 1, 2, ...)
3. Wrap in a transaction for atomicity

### Error Code Conventions (from existing codebase)

- `VALIDATION_ERROR` — 400 (bad input)
- `NOT_FOUND` — 404 (resource doesn't exist or ownership mismatch)
- `CONFLICT` — 409 (duplicate board-link)
- `UNAUTHORIZED` — 401 (not authenticated)

### Testing Patterns

- Co-located tests: `route.test.ts` next to `route.ts`
- Component tests: `*.test.tsx` next to component
- DB function tests: `board-links.test.ts` already exists — extend it
- Use `vi.mock` for Prisma client, auth session, etc.
- Test baseline: 296 tests passing, 8 skipped (as of Story 3.2)

### Project Structure Notes

- New files: `src/app/api/v1/boards/[id]/links/route.ts`, `src/app/api/v1/boards/[id]/links/[linkId]/route.ts`, `src/components/boards/board-link-add.tsx`
- Modified files: `src/lib/db/board-links.ts`, `src/lib/validations/board.ts`, `src/app/(dashboard)/dashboard/boards/[id]/page.tsx`
- All paths align with architecture doc's directory structure conventions

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Endpoints — Board-link association]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns — board_links table]
- [Source: src/lib/db/board-links.ts — existing addLinkToBoard/getNextBoardLinkPosition]
- [Source: src/lib/db/boards.ts — findBoardById includes boardLinks with link data]
- [Source: src/app/(dashboard)/dashboard/boards/[id]/page.tsx — placeholder to replace]
- [Source: 3-2-edit-and-delete-boards.md — dev agent record, established patterns]

### Previous Story Intelligence (from Story 3.2)

- Board CRUD API uses find-then-act pattern for ownership (not `where: { id, userId }` in update/delete directly)
- Code review found issues with: missing validation edge cases, inconsistent error codes — ensure error codes match conventions above
- UI uses `router.push("/dashboard/boards")` for navigation after mutations
- All 7 tasks completed, 296 tests passing after review fixes
- `isUniqueConstraintError` helper already exists in `src/lib/db/boards.ts` — consider reusing or extracting to shared utility for P2002 detection in board-links route

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Dev Agent Record

### Agent Model Used
openai/gpt-5.4

### Debug Log References
- `npm test`
- `npm run lint`
- `npm run build` *(fails on pre-existing Edge runtime logger issue in `src/lib/logger.ts:13`)*

### Completion Notes List
- Added board-link DB removal + position recompaction helpers and metadata query support.
- Added POST `/api/v1/boards/[id]/links` and DELETE `/api/v1/boards/[id]/links/[linkId]` with auth, ownership, validation, conflict, and not-found handling.
- Replaced board detail placeholder with interactive board link manager UI for add/remove flows.
- Added unit + route + component coverage for Story 3.3 paths.

### File List
- `src/lib/db/board-links.ts`
- `src/lib/db/board-links.test.ts`
- `src/lib/validations/board.ts`
- `src/lib/validations/board.test.ts`
- `src/app/api/v1/boards/[id]/links/route.ts`
- `src/app/api/v1/boards/[id]/links/route.test.ts`
- `src/app/api/v1/boards/[id]/links/[linkId]/route.ts`
- `src/app/api/v1/boards/[id]/links/[linkId]/route.test.ts`
- `src/components/boards/board-link-add.tsx`
- `src/components/boards/board-link-add.test.tsx`
- `src/app/(dashboard)/dashboard/boards/[id]/page.tsx`
