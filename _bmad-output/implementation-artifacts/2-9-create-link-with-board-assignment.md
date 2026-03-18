# Story 2.9: Create Link with Board Assignment

Status: done

## Story

As a logged-in user,
I want to create a link and assign it to a board in one action,
so that I can organize links into boards without extra steps.

## Acceptance Criteria

1. **Given** I am on the link creation form, **When** I provide a target URL and select a board from a dropdown of my boards, **Then** the link is created AND added to the selected board in a single operation via the `board_links` join table. The board dropdown shows only boards I own.

2. **Given** I create a link without selecting a board, **When** I submit the form, **Then** the link is created in my link library without any board assignment (existing behavior preserved).

3. **Given** the Board and BoardLink models do not yet exist in the Prisma schema, **Then** this story adds them to `prisma/schema.prisma` and runs a migration so that board assignment is possible. Board creation UI is NOT part of this story (Epic 3).

4. **Given** the POST `/api/v1/links` endpoint receives a `boardId` parameter, **When** the link is created, **Then** the link is also added to the specified board via a `BoardLink` record with `position` set to the next available position in that board. If `boardId` is omitted, behavior is unchanged.

5. **Given** an invalid or non-existent `boardId` is provided, **When** the API processes the request, **Then** a 400 error is returned with a clear error message. No partial link-board assignment is created.

## Tasks / Subtasks

- [x] Add Board and BoardLink models to Prisma schema (AC: #3)
  - [x] Add `BoardVisibility` enum: `Public`, `Private`, `Unlisted`
  - [x] Add `Board` model: `id` (UUID), `name`, `slug` (unique), `description`, `visibility` (BoardVisibility, default Private), `userId`, `createdAt`, `updatedAt`
  - [x] Add `BoardLink` model (join table): `id` (UUID), `boardId`, `linkId`, `position` (Int), `addedAt` (DateTime)
  - [x] Add relations: Board -> User, Board -> BoardLink, Link -> BoardLink
  - [x] Add `@@map` for snake_case table names: `boards`, `board_links`
  - [x] Add unique constraint: `@@unique([boardId, linkId])` on BoardLink
  - [x] Add index: `@@index([boardId, position])` on BoardLink
  - [x] Run `npx prisma migrate dev --name add-boards-and-board-links`

- [x] Add `boardId` to create link validation schema (AC: #4)
  - [x] Add optional `boardId` (UUID string) to `createLinkSchema` in `src/lib/validations/link.ts`

- [x] Add board data access functions (AC: #1, #4, #5)
  - [x] Create `src/lib/db/boards.ts` with `findBoardsByUserId()` and `findBoardById()`
  - [x] Create `src/lib/db/board-links.ts` with `addLinkToBoard()` and `getNextBoardLinkPosition()`

- [x] Update POST `/api/v1/links` route handler (AC: #1, #2, #4, #5)
  - [x] Accept `boardId` from request body
  - [x] If `boardId` provided: validate board exists + user owns it, create link + board-link in Prisma transaction
  - [x] If `boardId` omitted: create link only (existing behavior)
  - [x] Return 400 if `boardId` is invalid or board not found/not owned

- [x] Update create link form with board selector (AC: #1, #2)
  - [x] Add board selector dropdown to `src/components/links/create-link-form.tsx`
  - [x] Pass boards list from server component parent (`links/page.tsx`)
  - [x] Board selection is optional -- form works without selecting a board
  - [x] Keyboard accessible with visible focus indicators

- [x] Write tests (AC: all)
  - [x] DB function tests for `findBoardsByUserId`, `findBoardById`, `addLinkToBoard`
  - [x] API route tests: POST with boardId, POST without boardId, POST with invalid boardId
  - [x] Validation schema tests for boardId field
  - [x] Regression: all existing tests must continue passing

## Dev Notes

### Architecture Compliance

- **Data access boundary** -- `lib/db/*` is the ONLY module that imports Prisma client. Create `lib/db/boards.ts` and `lib/db/board-links.ts` for board-related queries. Route handlers call `lib/db/` functions, never Prisma directly. [Source: architecture.md -- Data Boundaries]
- **Prisma transactions** -- Use `prisma.$transaction()` for atomic link + board-link creation. This ensures no orphaned records if board assignment fails. [Source: architecture.md -- Prisma 7]
- **API response format** -- `{ data: { ...linkResponse } }` for success. `{ error: { code, message } }` for failures. [Source: architecture.md -- API Response Formats]
- **Zod validation at API boundary** -- Add `boardId` to `createLinkSchema` in `lib/validations/link.ts`. UUID format validation. [Source: architecture.md -- Validation Pattern]
- **Naming conventions** -- `snake_case` for DB tables (`boards`, `board_links`), `PascalCase` for Prisma models (`Board`, `BoardLink`), `PascalCase` for enums (`BoardVisibility`), `camelCase` for functions (`findBoardById`, `addLinkToBoard`). [Source: architecture.md -- Naming Patterns]
- **Structured logging** -- Use `logger` from `src/lib/logger.ts`, never `console.log`. [Source: architecture.md]
- **No shadcn/ui** -- The project has NO `src/components/ui/` directory yet. Use plain HTML + Tailwind CSS for the board dropdown, matching existing component styles in `create-link-form.tsx`. Do NOT install shadcn/ui. [Source: Story 2.8 dev notes]
- **Redis cache invalidation** -- When creating a link with board assignment, the link itself needs cache invalidation via `invalidateLinkCache()` from `src/lib/cache/link-cache.ts` (same as existing link creation). Board data does NOT need caching yet. [Source: architecture.md -- Caching Strategy]

### Technical Requirements

- **Prisma schema additions**: The `Board` and `BoardLink` models must be added to `prisma/schema.prisma`. This is schema preparation for Epic 3, but FR30 requires board assignment during link creation, so the models must exist now. The schema should match the architecture's planned structure from Story 3.1's acceptance criteria:
  ```prisma
  enum BoardVisibility {
    Public
    Private
    Unlisted
  }

  model Board {
    id          String          @id @default(uuid())
    name        String
    slug        String          @unique
    description String?
    visibility  BoardVisibility @default(Private)
    userId      String          @map("user_id")
    createdAt   DateTime        @default(now()) @map("created_at")
    updatedAt   DateTime        @updatedAt @map("updated_at")
    user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
    boardLinks  BoardLink[]
    @@map("boards")
    @@index([userId])
  }

  model BoardLink {
    id       String   @id @default(uuid())
    boardId  String   @map("board_id")
    linkId   String   @map("link_id")
    position Int
    addedAt  DateTime @default(now()) @map("added_at")
    board    Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
    link     Link     @relation(fields: [linkId], references: [id], onDelete: Cascade)
    @@unique([boardId, linkId])
    @@index([boardId, position])
    @@map("board_links")
  }
  ```
- **User model relation**: Add `boards Board[]` relation to the existing `User` model.
- **Link model relation**: Add `boardLinks BoardLink[]` relation to the existing `Link` model.
- **Board position calculation**: When adding a link to a board, calculate `position` as `MAX(position) + 1` for that board (or 0 if board is empty). Use `prisma.boardLink.aggregate({ where: { boardId }, _max: { position: true } })`.
- **Transaction for atomicity**: Link creation + board assignment must be wrapped in `prisma.$transaction()` to prevent partial states (link created but board assignment failed).
- **Board ownership validation**: Before assigning to a board, verify `board.userId === session.user.id`. Return 400 if board not found or not owned by user. Do NOT return 404 for boards -- use 400 with "Invalid board" message to avoid leaking board existence to other users.
- **Form board fetching**: The create-link-form needs the user's boards list. Pass boards as props from the server component parent page (matches existing server component data fetching pattern in `links/page.tsx`). Add a `findBoardsByUserId()` function to `src/lib/db/boards.ts` and call it from the parent page server component.
- **Board dropdown UI**: Simple `<select>` element with Tailwind styling. First option: "No board" or empty placeholder. Remaining options: user's boards by name. Match the existing form field styling in `create-link-form.tsx` (zinc/emerald color palette, rounded borders, dark theme).

### Existing Code to Reuse

- **`createLink()`** in `src/lib/db/links.ts` -- Current link creation function. Keep it unchanged. Handle board assignment separately in the route handler using a Prisma transaction that wraps both link creation and board-link creation.
- **`createLinkSchema`** in `src/lib/validations/link.ts` -- Add optional `boardId` field (UUID string). Existing fields: `url`, `customSlug`, `title`, `description`, `tags`, `expiresAt`.
- **POST handler** in `src/app/api/v1/links/route.ts` -- Existing POST handler for link creation with slug generation (3 attempts for auto-slug). Extend to handle optional `boardId`.
- **`toLinkResponse()`** in `src/lib/api-response.ts` -- Serializes Link model to API response format. Reuse as-is.
- **`successResponse()` / `errorResponse()`** in `src/lib/api-response.ts` -- Standard response wrappers.
- **`AppError`** in `src/lib/errors.ts` -- Use for business logic errors (invalid boardId, ownership check).
- **`auth()`** in `src/lib/auth/config.ts` -- Session check for user authentication.
- **`invalidateLinkCache()`** in `src/lib/cache/link-cache.ts` -- Cache invalidation after link creation (already called in POST handler).
- **`create-link-form.tsx`** in `src/components/links/` -- Existing form with react-hook-form + Zod. Uses fields: targetUrl, customSlug, title, description, tags, expiresAt. Add board selector alongside these.

### Scope Boundaries

**IN scope for this story:**
- Board and BoardLink Prisma models + migration
- `boardId` optional field in `createLinkSchema`
- `findBoardsByUserId()` and `findBoardById()` in `src/lib/db/boards.ts`
- `addLinkToBoard()` in `src/lib/db/board-links.ts`
- Updated POST `/api/v1/links` with optional `boardId` handling
- Board selector dropdown in create-link-form
- Server component passes boards list to form
- Tests for all new/modified code

**OUT of scope -- do NOT implement:**
- Board creation form/page (Epic 3, Story 3.1)
- Board CRUD API endpoints -- GET/PATCH/DELETE `/api/v1/boards` (Epic 3)
- Board detail view page (Epic 3, Story 3.5)
- Board list page in dashboard (Epic 3)
- Add/remove links from boards after creation (Epic 3, Story 3.3)
- Board reordering (Epic 3, Story 3.4)
- Public board rendering (Epic 5)
- Board visibility enforcement on public access (Epic 5)
- Updating board assignment on existing links (Epic 3)
- Board slug auto-generation from name (only needed in Epic 3 board creation)
- shadcn/ui installation or any UI framework changes

### File / Technical Scope

Files to **create**:
- `prisma/migrations/YYYYMMDDHHMMSS_add_boards_and_board_links/migration.sql` (auto-generated)
- `src/lib/db/boards.ts` -- `findBoardsByUserId()`, `findBoardById()`
- `src/lib/db/boards.test.ts` -- Board query tests
- `src/lib/db/board-links.ts` -- `addLinkToBoard()`, `getNextBoardLinkPosition()`
- `src/lib/db/board-links.test.ts` -- Board-link tests

Files to **modify**:
- `prisma/schema.prisma` -- Add Board, BoardLink models, BoardVisibility enum, relations on User and Link
- `src/lib/validations/link.ts` -- Add `boardId` to `createLinkSchema`
- `src/app/api/v1/links/route.ts` -- Update POST handler for `boardId`
- `src/app/api/v1/links/route.test.ts` -- Add tests for boardId scenarios
- `src/components/links/create-link-form.tsx` -- Add board selector dropdown
- `src/app/(dashboard)/links/page.tsx` -- Pass boards list to create-link-form

Files to **NOT modify**:
- `src/lib/db/links.ts` -- Keep existing link functions unchanged. Board assignment is handled separately via transaction in route handler.
- `src/middleware.ts` -- No redirect changes needed.
- `src/lib/cache/*` -- No new caching. Board data is not cached.
- `src/components/links/link-library.tsx` -- Board membership display stays as placeholder (from Story 2.8).
- `src/components/links/link-filters.tsx` -- No filter changes.
- `src/components/links/link-pagination.tsx` -- No pagination changes.

### Testing Requirements

- **DB function tests** (new `src/lib/db/boards.test.ts`): Test `findBoardsByUserId` returns user's boards. Test `findBoardById` returns board with ownership verification. Test returns null for non-existent board.
- **DB function tests** (new `src/lib/db/board-links.test.ts`): Test `addLinkToBoard` creates BoardLink record. Test position calculation (first link = position 0, subsequent = max+1). Test unique constraint prevents duplicate board-link.
- **API route tests** (extend `src/app/api/v1/links/route.test.ts`): Test POST with valid `boardId` creates link + board assignment. Test POST without `boardId` creates link only (regression). Test POST with invalid `boardId` returns 400. Test POST with `boardId` belonging to another user returns 400. Test POST with non-existent `boardId` returns 400.
- **Validation tests**: Test `createLinkSchema` accepts valid UUID for `boardId`. Test rejects non-UUID strings. Test accepts request without `boardId`.
- **Regression**: All existing tests (215 passed, 8 skipped) must continue passing.

### Anti-Patterns to Avoid

- Do NOT create board CRUD endpoints (GET/POST/PATCH/DELETE `/api/v1/boards`) -- that's Epic 3.
- Do NOT create board creation UI or inline board creation -- board creation is Epic 3, Story 3.1.
- Do NOT use `console.log` -- use the structured logger from `src/lib/logger.ts`.
- Do NOT import Prisma client outside `lib/db/` -- create proper data access functions in `lib/db/boards.ts` and `lib/db/board-links.ts`.
- Do NOT skip the Prisma transaction -- link + board-link must be atomic.
- Do NOT install shadcn/ui -- use plain HTML + Tailwind matching existing form component styles.
- Do NOT use `any` type -- use `unknown` and narrow, or define proper types.
- Do NOT add board list/detail pages or navigation -- that's Epic 3.
- Do NOT modify `findLinksByUserId()` or `findLinksForLibrary()` -- those functions are stable.
- Do NOT return 404 for invalid boardId -- return 400 to avoid leaking board existence.
- Do NOT implement board slug auto-generation -- boards are created with slug in Epic 3.

### Previous-Story Intelligence

- **Story 2.8** completed with 215 tests passing, 8 skipped (DB integration tests -- no local DB tables/availability). Agent model: openai/gpt-5.4. Validation: `npm run lint` passed, `npm test` passed.
- **Story 2.8** established paginated link library with search/filter using URL search params, server component data fetching, and `router.refresh()` for mutations. The same `router.refresh()` pattern should be used after link creation with board assignment to refresh the link list.
- **Existing `create-link-form.tsx`** uses react-hook-form with Zod validation, tag normalization (trim, lowercase, deduplicate), and API call to POST `/api/v1/links`. Success state shows created short URL with copy button. The board selector dropdown should integrate naturally into this form.
- **Code conventions from previous stories**: `verbNoun` function naming (e.g., `createLink`, `findLinkById`), co-located `*.test.ts` files, `describe`/`it` test blocks, logger key format `"module.action"`, Tailwind dark theme with zinc/emerald color palette, rounded-2xl/3xl border-zinc-800 card patterns.
- **API response pattern**: `successResponse({ data })` with `toLinkResponse()` for serialization. Error responses use `AppError` with structured error format `{ error: { code, message } }`.

### Git Intelligence

Recent commits follow `[BMAD Phase 4] Story X.Y: Description` pattern. Single commit per story.
- Function naming pattern: `createLink`, `findLinkBySlug`, `updateLink`, `deleteLink`, `findLinksForLibrary` -> new: `findBoardsByUserId`, `findBoardById`, `addLinkToBoard`, `getNextBoardLinkPosition`
- 215 tests currently passing, 8 skipped

### Project Structure Notes

```
prisma/schema.prisma                       # MODIFY -- add Board, BoardLink, BoardVisibility
src/lib/db/boards.ts                       # CREATE -- findBoardsByUserId(), findBoardById()
src/lib/db/boards.test.ts                  # CREATE -- board query tests
src/lib/db/board-links.ts                  # CREATE -- addLinkToBoard(), getNextBoardLinkPosition()
src/lib/db/board-links.test.ts             # CREATE -- board-link tests
src/lib/validations/link.ts                # MODIFY -- add boardId to createLinkSchema
src/app/api/v1/links/route.ts              # MODIFY -- handle boardId in POST
src/app/api/v1/links/route.test.ts         # MODIFY -- add boardId test cases
src/components/links/create-link-form.tsx   # MODIFY -- add board selector dropdown
src/app/(dashboard)/links/page.tsx          # MODIFY -- pass boards list to form
```

Alignment with architecture.md: `lib/db/boards.ts` for board data access, `lib/db/board-links.ts` for join table operations, `components/links/create-link-form.tsx` for link creation UI with board selection.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.9: Create Link with Board Assignment]
- [Source: _bmad-output/planning-artifacts/epics.md -- FR30 (create link with board assignment)]
- [Source: _bmad-output/planning-artifacts/epics.md -- Story 3.1 AC (Board model: boards + board_links tables, BoardVisibility enum)]
- [Source: _bmad-output/planning-artifacts/architecture.md -- Naming: snake_case tables (boards, board_links), PascalCase models/enums (Board, BoardLink, BoardVisibility)]
- [Source: _bmad-output/planning-artifacts/architecture.md -- Data Boundaries: lib/db/* only module importing Prisma]
- [Source: _bmad-output/planning-artifacts/architecture.md -- API Response Formats: { data } / { error: { code, message } }]
- [Source: _bmad-output/planning-artifacts/architecture.md -- Validation: Zod at API boundary, createLinkSchema in lib/validations/link.ts]
- [Source: _bmad-output/planning-artifacts/architecture.md -- Directory Structure: lib/db/boards.ts, components/links/create-link-form.tsx]
- [Source: _bmad-output/planning-artifacts/architecture.md -- Route pattern: app/api/v1/boards/[boardId]/route.ts]
- [Source: _bmad-output/planning-artifacts/prd.md -- FR30 (create link and assign to board in single action)]
- [Source: _bmad-output/planning-artifacts/prd.md -- FR8 (board with name, description, visibility: public/private/unlisted)]
- [Source: _bmad-output/implementation-artifacts/2-8-link-library-with-search-and-filter.md -- Previous story: 215 tests, no shadcn/ui, zinc/emerald theme]
- [Source: src/components/links/create-link-form.tsx -- Existing form with react-hook-form + Zod]
- [Source: src/lib/validations/link.ts -- Existing createLinkSchema with url, customSlug, title, description, tags, expiresAt]
- [Source: src/app/api/v1/links/route.ts -- Existing POST handler with slug generation]
- [Source: prisma/schema.prisma -- Current schema: User, Link, Account, Session, VerificationToken (no Board/BoardLink)]

## Dev Agent Record

### Agent Model Used

claude-opus-4-6 (code review + fixes)

### Debug Log References

### Completion Notes List

- Code review identified 8 issues (3 critical, 3 medium, 2 low)
- Fixed: UI text leaking "Epic 3" internal terminology to users
- Fixed: Moved transaction logic from `board-links.ts` to route handler per architecture guidance
- Fixed: Added 4 board selector form tests (render, empty state, submit with boardId, server error)
- Fixed: Story status updated from `ready-for-dev` to `done`, all tasks marked `[x]`
- Fixed: Dev Agent Record populated with file list and completion notes
- 243 tests passing, 8 skipped. Lint clean.

### Change Log

- 2026-03-18: Code review pass — fixed 6 issues, added tests, updated story tracking

### File List

Files created:
- `prisma/migrations/20260318031500_add_boards_and_board_links/migration.sql` — Board/BoardLink migration
- `src/lib/db/boards.ts` — `findBoardsByUserId()`, `findBoardById()`
- `src/lib/db/boards.test.ts` — Board data access tests (3 tests)
- `src/lib/db/board-links.ts` — `addLinkToBoard()`, `getNextBoardLinkPosition()`
- `src/lib/db/board-links.test.ts` — Board-link data access tests (3 tests)

Files modified:
- `prisma/schema.prisma` — Added `BoardVisibility` enum, `Board` model, `BoardLink` model, relations on `User` and `Link`
- `src/lib/validations/link.ts` — Added optional `boardId` (UUID) to `createLinkSchema`
- `src/lib/validations/link.test.ts` — Added boardId validation tests (2 tests)
- `src/app/api/v1/links/route.ts` — Added `boardId` handling with Prisma transaction in POST handler
- `src/app/api/v1/links/route.test.ts` — Added board assignment API tests (5 tests)
- `src/components/links/create-link-form.tsx` — Added board selector `<select>` dropdown
- `src/components/links/create-link-form.test.tsx` — Added board selector form tests (4 tests)
- `src/app/(dashboard)/links/page.tsx` — Fetches user boards, passes to `CreateLinkForm`
