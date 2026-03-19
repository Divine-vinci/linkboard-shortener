# Story 7.3: Boards and Board-Links REST API Endpoints

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an API consumer,
I want to manage boards and board membership via REST API,
so that I can organize links programmatically.

## Acceptance Criteria

1. **Given** I have a valid API key in `Authorization: Bearer <key>`, **When** I `POST /api/v1/boards` with `{ name, description?, visibility }`, **Then** a board is created and returned as `{ data: board }` with 201 status.

2. **Given** I have a valid API key, **When** I `GET /api/v1/boards` with optional `?limit=20&offset=0`, **Then** I receive `{ data: [...boards], pagination: { total, limit, offset } }` with 200 status, **And** only my own boards are returned (NFR13).

3. **Given** I have a valid API key, **When** I `PATCH /api/v1/boards/{id}` with updated fields, **Then** the board is updated and returned with 200 status.

4. **Given** I have a valid API key, **When** I `DELETE /api/v1/boards/{id}`, **Then** the board is deleted (links preserved) and 204 is returned.

5. **Given** I have a valid API key, **When** I `POST /api/v1/boards/{id}/links` with `{ linkId }`, **Then** the link is added to the board and returned with 201 status (FR36).

6. **Given** I have a valid API key, **When** I `DELETE /api/v1/boards/{id}/links` with `{ linkId }`, **Then** the link is removed from the board without deleting it and 204 is returned (FR36).

7. **And** all API responses return in < 200ms at p95 (NFR2), **And** all input is validated with Zod schemas (NFR11), **And** invalid API keys return 401 `{ error: { code: "UNAUTHORIZED" } }`.

## Tasks / Subtasks

- [x] Task 1: Add dual-auth to board list and create routes (AC: #1, #2, #7)
  - [x] Update `src/app/api/v1/boards/route.ts` — replace `auth()` with `resolveUserId()` in GET and POST handlers
  - [x] Import `resolveUserId` from `@/lib/auth/api-key-middleware`
  - [x] Import `errorResponse` and `AppError` for consistent 401 responses
  - [x] Verify GET returns `{ data: BoardResponse[], pagination: { total, limit, offset } }` format
  - [x] Verify POST returns `{ data: BoardResponse }` with 201 status

- [x] Task 2: Add dual-auth to board CRUD routes (AC: #3, #4, #7)
  - [x] Update `src/app/api/v1/boards/[id]/route.ts` — replace `auth()` with `resolveUserId()` in GET, PATCH, DELETE handlers
  - [x] Verify PATCH returns `{ data: BoardResponse }` with 200 status
  - [x] Verify DELETE returns 204 with no body

- [x] Task 3: Add dual-auth to board-links routes (AC: #5, #6, #7)
  - [x] Update `src/app/api/v1/boards/[id]/links/route.ts` — replace `auth()` with `resolveUserId()` in POST handler; delete coverage applied on `src/app/api/v1/boards/[id]/links/[linkId]/route.ts` existing delete endpoint
  - [x] Verify POST returns 201 with board-link data
  - [x] Verify DELETE returns 204

- [x] Task 4: Add dual-auth to board-links reorder route (not in AC but must not regress)
  - [x] Update `src/app/api/v1/boards/[id]/links/reorder/route.ts` — replace `auth()` with `resolveUserId()`
  - [x] Ensure reorder continues to work for both session and API key auth

- [x] Task 5: Add API key auth test cases to board routes (AC: all)
  - [x] Update `src/app/api/v1/boards/route.test.ts` — add API key auth tests for GET and POST
  - [x] Update `src/app/api/v1/boards/[id]/route.test.ts` — add API key auth tests for GET, PATCH, DELETE
  - [x] Update `src/app/api/v1/boards/[id]/links/route.test.ts` — add API key auth tests for POST; delete endpoint coverage added in `src/app/api/v1/boards/[id]/links/[linkId]/route.test.ts`
  - [x] Test matrix per endpoint: no auth → 401, invalid API key → 401, valid API key → success, valid session → success (backward compat), ownership enforcement → 404

- [x] Task 6: Verify and run tests (AC: all)
  - [x] Run `npm test` — all existing tests must still pass (432+ tests baseline)
  - [x] Run `npm run lint` — must pass

## Dev Notes

### Critical: This is a MINIMAL-CHANGE story

All board routes, DB functions, validation schemas, and response helpers already exist and are fully functional with session auth. **Do NOT rewrite or restructure any existing code.** The only change is swapping `auth()` calls with `resolveUserId()` — the exact same pattern applied in Story 7.2 for links.

### Dual-Auth Pattern (from Story 7.2 — REUSE EXACTLY)

The `resolveUserId` function already exists at `src/lib/auth/api-key-middleware.ts`:

```typescript
import { resolveUserId } from "@/lib/auth/api-key-middleware";

// In each route handler, replace:
const session = await auth();
const userId = session?.user?.id;
if (!userId) { return NextResponse.json(errorResponse(...), { status: 401 }); }

// With:
const userId = await resolveUserId(request);
if (!userId) { return NextResponse.json(errorResponse(new AppError("UNAUTHORIZED", "Authentication required", 401)), { status: 401 }); }
```

**IMPORTANT:** The `resolveUserId` function tries API key auth first (cheaper — no session DB lookup), then falls back to session auth. This is already proven and tested in the links API.

### Existing Board Route Handlers (modify these files)

**`src/app/api/v1/boards/route.ts`** — GET (list boards) + POST (create board)
- Currently uses `auth()` from `@/lib/auth/config`
- GET: returns `{ data: BoardResponse[], pagination: { total, limit, offset } }` — already correct format
- POST: validates with `createBoardSchema`, returns 201 — already correct

**`src/app/api/v1/boards/[id]/route.ts`** — GET + PATCH + DELETE single board
- Currently uses `auth()` — swap to `resolveUserId(request)`
- All ownership checks already use `userId` from auth — no changes needed there

**`src/app/api/v1/boards/[id]/links/route.ts`** — POST (add link) + DELETE (remove link)
- POST: validates `{ linkId }` with `addBoardLinkSchema`, returns 201
- DELETE: removes link from board, recompacts positions in transaction, returns 204
- Handles P2002 Prisma error for duplicate board-link → 409 CONFLICT

**`src/app/api/v1/boards/[id]/links/reorder/route.ts`** — PATCH (reorder links)
- Not in AC but must get dual-auth too for completeness — API consumers will need reorder

### Existing DB Functions (DO NOT modify — all in place)

**`src/lib/db/boards.ts`:**
- `createBoard({ name, description, visibility, userId })` — auto-generates unique slug
- `findBoardsByUserId(userId, { limit?, offset? })` — paginated list with `_count.boardLinks`
- `countBoardsByUserId(userId)` — total count for pagination
- `findBoardById(id)` — full board with boardLinks and nested link data
- `findBoardSummaryById(id)` — lightweight lookup with just count
- `updateBoard(id, userId, data)` — partial update, returns null if not found/not owned
- `deleteBoard(id, userId)` — returns boolean success

**`src/lib/db/board-links.ts`:**
- `addLinkToBoard({ boardId, linkId })` — adds at next position
- `removeLinkFromBoard(boardId, linkId)` — removes by compound key
- `recompactBoardLinkPositions(boardId)` — normalize positions after deletion
- `reorderBoardLinks(boardId, orderedLinkIds[])` — bulk reorder with transaction
- `getBoardLinksWithMetadata(boardId)` — full link data ordered by position

### Existing Validation Schemas (DO NOT modify — all in place)

**`src/lib/validations/board.ts`:**
- `createBoardSchema` — `{ name: string(1-100), description?: string(0-500), visibility: BoardVisibility(default: Private) }`
- `updateBoardSchema` — `{ name?, description?, visibility? }` with `.refine(at least one field)`
- `addBoardLinkSchema` — `{ linkId: z.uuid() }`
- `reorderBoardLinksSchema` — `{ linkIds: z.uuid[](min 1) }`
- `boardListQuerySchema` — `{ limit: number(default 20, max 100), offset: number(default 0) }`

### Response Helpers (already in use — `src/lib/api-response.ts`)

- `successResponse(data)` → `{ data }`
- `errorResponse(appError, details?)` → `{ error: { code, message, details? } }`
- `toBoardResponse(board)` — converts Board to API format (dates → ISO strings)

### Imports to Add per Route File

```typescript
// Add these imports:
import { resolveUserId } from "@/lib/auth/api-key-middleware";

// Remove (or keep as unused — but prefer removing):
// import { auth } from "@/lib/auth/config";  // Only if no other use in file
```

**Note:** If the route file also uses `auth` for something else (unlikely), keep it. Otherwise remove the import.

### Testing Pattern (follow Story 7.2 exactly)

Mock `authenticateApiKey` from `@/lib/auth/api-key-middleware` alongside existing `auth` mock:

```typescript
vi.mock("@/lib/auth/api-key-middleware", () => ({
  authenticateApiKey: vi.fn(),
  resolveUserId: vi.fn(),
}));
```

Test cases to add per endpoint:
1. **No auth** → 401 `{ error: { code: "UNAUTHORIZED" } }`
2. **Invalid API key** (resolveUserId returns null) → 401
3. **Valid API key** (resolveUserId returns userId) → success path
4. **Valid session** (resolveUserId returns userId) → success path (backward compat)
5. **Ownership enforcement** — accessing other user's board → 404

Examine existing test files (`src/app/api/v1/boards/route.test.ts`, etc.) to understand current test structure and mock patterns, then add API key auth test cases following the same patterns.

### Project Structure Notes

- All file locations are unchanged — only modifying existing route.ts files
- No new files needed (unlike Story 7.2 which created api-key-middleware.ts)
- No new dependencies needed
- No new validation schemas needed — existing board schemas already match API requirements

### Security Considerations

- All queries already enforce `userId` ownership via the existing DB functions — no changes needed
- Raw API keys are never logged — handled by `authenticateApiKey`
- `lastUsedAt` update is fire-and-forget (already in middleware)
- Invalid UUID params should return 404 not 500 — verify existing error handling covers this

### References

- [Source: epics.md, Story 7.3 — acceptance criteria and BDD scenarios]
- [Source: architecture.md, "API Style: RESTful via Next.js Route Handlers" — `app/api/v1/boards/[boardId]/route.ts`]
- [Source: architecture.md, "Format Patterns" — response wrappers, pagination, status codes]
- [Source: architecture.md, "API Naming Conventions" — plural nouns, kebab-case, PATCH not PUT]
- [Source: architecture.md, "Authentication & Security" — ownership-based authorization, NFR13]
- [Source: prd.md, FR36 — Boards REST API endpoints]
- [Source: prd.md, NFR2 — < 200ms p95 API response time]
- [Source: prd.md, NFR11 — Zod validation on all inputs]
- [Source: prd.md, NFR13 — ownership-based access control]

### Previous Story Intelligence (7.2)

Story 7.2 established the dual-auth pattern for REST API:
- Created `src/lib/auth/api-key-middleware.ts` with `authenticateApiKey()` and `resolveUserId()`
- Created `src/lib/validations/api-link.ts` for API-specific schemas (not needed here — board schemas already match)
- Modified links routes to use `resolveUserId()` instead of `auth()`
- Added `findLinksWithOffset()` for API offset-based pagination (boards already have offset-based pagination)
- Test baseline: 432 passed, 9 skipped; `npm run lint` passed
- The dual-auth swap was straightforward with no edge cases — expect same for boards
- Dev result confirmed: "Dual-auth resolution prefers API key auth, then falls back to session auth"

### Git Intelligence

Recent commits:
- `6af4c0b [BMAD Phase 4] Story 7.2: Links REST API Endpoints` — dual-auth pattern established
- `0d14e01 [BMAD Phase 4] Story 7.1: API Key Generation and Management` — API key infra
- Follow commit pattern: `[BMAD Phase 4] Story 7.3: Boards and Board-Links REST API Endpoints`
- 432+ passing tests, codebase is stable

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `npm test -- src/app/api/v1/boards/route.test.ts src/app/api/v1/boards/[id]/route.test.ts src/app/api/v1/boards/[id]/links/route.test.ts src/app/api/v1/boards/[id]/links/[linkId]/route.test.ts src/app/api/v1/boards/[id]/links/reorder/route.test.ts`
- `npm test`
- `npm run lint`

### Completion Notes List

- Swapped board collection + board detail route auth to `resolveUserId(request)` so API key and session auth share the same ownership checks and 401 envelope.
- Swapped board-link create, board-link delete, and reorder route auth to `resolveUserId(request)` without changing existing persistence/validation flows.
- Added API key/session/no-auth/invalid-key coverage across board collection, board detail, board-link create/delete, and reorder handlers.
- Validation: `npm test -- src/app/api/v1/boards/route.test.ts src/app/api/v1/boards/[id]/route.test.ts src/app/api/v1/boards/[id]/links/route.test.ts src/app/api/v1/boards/[id]/links/[linkId]/route.test.ts src/app/api/v1/boards/[id]/links/reorder/route.test.ts`; `npm test`; `npm run lint`.

### File List

- `src/app/api/v1/boards/route.ts`
- `src/app/api/v1/boards/route.test.ts`
- `src/app/api/v1/boards/[id]/route.ts`
- `src/app/api/v1/boards/[id]/route.test.ts`
- `src/app/api/v1/boards/[id]/links/route.ts`
- `src/app/api/v1/boards/[id]/links/route.test.ts`
- `src/app/api/v1/boards/[id]/links/[linkId]/route.ts`
- `src/app/api/v1/boards/[id]/links/[linkId]/route.test.ts`
- `src/app/api/v1/boards/[id]/links/reorder/route.ts`
- `src/app/api/v1/boards/[id]/links/reorder/route.test.ts`

## Senior Developer Review (AI)

**Reviewer:** Amelia (Claude Opus 4.6)
**Date:** 2026-03-19
**Outcome:** Approved with fixes applied

### Findings Summary
- **0 HIGH** | **2 MEDIUM (fixed)** | **3 LOW (documented)**

### Fixed Issues
1. **[M1]** Added ownership enforcement test via API key auth — `src/app/api/v1/boards/[id]/route.test.ts` — verifies `apiKey(userId: A) + board(userId: B) → 404`
2. **[M2]** Enhanced API key delete test in `src/app/api/v1/boards/[id]/links/[linkId]/route.test.ts` — added `boardLink.findUnique` and `$transaction` call assertions to match session-auth test thoroughness

### Documented (not fixed — pre-existing or by-design)
3. **[L1]** Test mock re-implements `resolveUserId` logic (matches Story 7.2 pattern — consistent but inherently fragile)
4. **[L2]** AC#6 URL structure mismatch: AC says body param, implementation uses path param (better REST practice, pre-existing)
5. **[L3]** `toBoardResponse` exposes `_count` and `userId` in API surface (pre-existing Prisma leak)

### Verification
- All 42 board tests pass (41 original + 1 new ownership test)
- Full suite: 465 tests pass, 9 skipped

## Change Log

- 2026-03-19: Added dual-auth support to boards + board-links REST endpoints and expanded API key regression coverage.
- 2026-03-19: [Code Review] Fixed 2 MEDIUM issues: added API key ownership enforcement test, enhanced API key delete test assertions.
