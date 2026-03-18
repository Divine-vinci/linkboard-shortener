# Story 2.6: Delete Links

Status: done

## Story

As a logged-in user,
I want to permanently delete a short link,
so that I can remove links I no longer need.

## Acceptance Criteria

1. **Given** I own a short link, **When** I delete it via `DELETE /api/v1/links/[id]`, **Then** the link is permanently removed from the database and a 204 (no body) response is returned.

2. **Given** a link has been deleted, **When** anyone queries or tries to access that link's slug, **Then** the system returns 404 — the link no longer exists.

3. **Given** I try to delete a link I don't own, **When** the server processes the request, **Then** I receive a 404 error (not 403 — don't leak existence) (NFR13).

4. **Given** I am not authenticated, **When** I try to delete a link, **Then** I receive a 401 error.

5. **Given** I provide an invalid link ID (not a valid UUID), **When** the server processes the request, **Then** I receive a 404 error.

6. **Given** I own a short link, **When** I click "Delete" in the link library UI and confirm, **Then** the link is removed from the displayed list and the DELETE API is called.

## Tasks / Subtasks

- [x] Add `deleteLink` function to data access layer (AC: #1, #2, #3)
  - [x] Add `deleteLink(id: string, userId: string): Promise<boolean>` to `src/lib/db/links.ts` — returns `true` if deleted, `false` if not found/not owned
  - [x] Use `findLinkById` to verify ownership first, then `prisma.link.delete()` — same pattern as `updateLink()`
  - [x] Add tests in `src/lib/db/links.test.ts` for delete: successful delete, not-found returns false, not-owned returns false

- [x] Add DELETE handler to link route (AC: #1, #2, #3, #4, #5)
  - [x] Add `DELETE` export to `src/app/api/v1/links/[id]/route.ts`
  - [x] Auth check first → 401 if no session (same pattern as PATCH)
  - [x] Call `deleteLink(id, userId)` → 204 (empty body) on success, 404 if not found
  - [x] Return `new NextResponse(null, { status: 204 })` — no JSON body for 204
  - [x] Log unexpected errors with `logger.error("links.delete.unexpected_error", ...)`
  - [x] Add tests in `src/app/api/v1/links/[id]/route.test.ts`:
    - [x] Successful delete returns 204 with no body
    - [x] Non-existent link returns 404
    - [x] Non-owned link returns 404 (not 403)
    - [x] Unauthenticated returns 401
    - [x] Verify link is actually gone after delete (GET/PATCH returns 404)

- [x] Add delete UI to link library (AC: #6)
  - [x] Add a "Delete" button to each `LinkCard` in `src/components/links/link-library.tsx`
  - [x] Add confirmation step before delete (window.confirm or inline confirmation)
  - [x] On confirm, call `DELETE /api/v1/links/${link.id}`
  - [x] On 204 success, remove the link from local state via `onLinkDeleted` callback
  - [x] On error, display error message
  - [x] Add `onLinkDeleted: (linkId: string) => void` prop to `LinkCard`
  - [x] Add `handleLinkDeleted` to `LinkLibrary` that filters the link out of state
  - [x] Add component tests in `src/components/links/link-library.test.tsx`:
    - [x] Delete button renders on each link card
    - [x] Clicking delete triggers confirmation
    - [x] Confirming calls DELETE API
    - [x] Successful delete removes link from list
    - [x] Error shows error message
    - [x] Cancelling confirmation does not delete

## Dev Notes

### Architecture Compliance

- **Auth first** — use `auth()` from `@/lib/auth/config` as the first operation in route handlers. [Source: architecture.md#Authentication Flow]
- **Versioned API** — all routes under `/api/v1/`. [Source: architecture.md#API Naming Conventions]
- **DELETE method** — `DELETE /api/v1/links/[id]` returns 204 with no body. [Source: architecture.md#API Response Formats: "204 (deleted, no body)"]
- **Thin route handlers** — auth → call `lib/db` → return status. [Source: architecture.md#Data Boundaries]
- **Response wrapper** — 204 has no body, so do NOT use `successResponse()`. Use `new NextResponse(null, { status: 204 })`. Error responses still use `errorResponse()`. [Source: architecture.md#API Response Formats]
- **Structured logging** — use `logger`, never `console.log`. [Source: architecture.md#Logging Pattern]
- **Co-located tests** — `*.test.ts` adjacent to source files. [Source: architecture.md#Structure Patterns]
- **NFR13** — return 404 (not 403) for links not owned by user. Don't leak existence. [Source: architecture.md, epics.md]

### Technical Requirements

- **Hard delete** — Prisma `prisma.link.delete({ where: { id } })`. This is a permanent deletion, not soft delete. The architecture and PRD specify "permanently delete".
- **No Prisma cascade concerns** — The `Link` model currently has no relations that reference it (no `BoardLink` model exists yet). When boards are built in Epic 3, the `board_links` table with `onDelete: Cascade` will handle cleanup automatically. No special handling needed now.
- **No Redis cache invalidation** — Redis caching is not yet implemented (Story 2.7). Do NOT add Redis code. When the redirect engine is built, cache invalidation on delete will be handled there.
- **204 response** — `DELETE` returns `204 No Content` with an empty body. Do NOT return JSON. Use `new NextResponse(null, { status: 204 })`.
- **UUID validation** — Prisma will throw if the `id` parameter is not a valid UUID. Catch this and return 404 (same as "not found").
- **Import `deleteLink`** — Add to the existing import in `route.ts`: `import { updateLink, deleteLink } from "@/lib/db/links"` (note: update the existing import, don't add a second one).

### Scope Boundaries

**IN scope for this story:**
- `deleteLink()` data access function with ownership check
- `DELETE /api/v1/links/[id]` route handler returning 204
- Delete button with confirmation in link library UI
- Tests for all layers (db, route, component)

**OUT of scope — do NOT implement:**
- Redis cache invalidation (Story 2.7 — redirect engine not built yet)
- Board-link cleanup (Epic 3 — boards not built yet; Prisma cascade will handle it when they are)
- Soft delete / trash / undo functionality (PRD says "permanently delete")
- Bulk delete
- Delete confirmation modal component (use `window.confirm` or inline confirmation)
- Analytics cleanup on delete (Epic 6 — analytics not built yet)

### File / Technical Scope

Files to **modify**:
- `src/lib/db/links.ts` — add `deleteLink()` function
- `src/lib/db/links.test.ts` — add delete tests
- `src/app/api/v1/links/[id]/route.ts` — add DELETE handler
- `src/app/api/v1/links/[id]/route.test.ts` — add DELETE tests
- `src/components/links/link-library.tsx` — add delete button + confirmation + callback
- `src/components/links/link-library.test.tsx` — add delete UI tests

Files to **create**: None. All changes extend existing files.

### Testing Requirements

- **DB layer tests** (`src/lib/db/links.test.ts`): delete existing link returns true, delete non-existent link returns false, delete non-owned link returns false, verify link is gone from DB after delete.
- **Route handler tests** (`src/app/api/v1/links/[id]/route.test.ts`): DELETE returns 204 with empty body, DELETE non-existent returns 404, DELETE non-owned returns 404 (not 403), DELETE unauthenticated returns 401. Verify the response body is empty on 204 (not JSON).
- **Component tests** (`src/components/links/link-library.test.tsx`): delete button renders, confirmation flow works, successful delete removes card from list, failed delete shows error, cancel does not delete.
- **Regression**: all existing Story 2.1–2.5 tests must continue passing. PATCH and POST functionality must be unaffected.

### Anti-Patterns to Avoid

- Do NOT return a JSON body on 204 — `new NextResponse(null, { status: 204 })`, not `NextResponse.json(...)`.
- Do NOT use `successResponse()` for the 204 — it wraps in `{ data }` which is wrong for empty responses.
- Do NOT implement soft delete — the PRD says "permanently delete".
- Do NOT add Redis/cache code — Story 2.7 doesn't exist yet.
- Do NOT add a `board_links` cleanup step — no boards model exists yet.
- Do NOT create a separate confirmation modal component — use `window.confirm()` for simplicity, consistent with the minimal UI patterns in the project.
- Do NOT add a separate delete endpoint path — use the existing `[id]` route file.
- Do NOT catch Prisma `P2025` (record not found) errors from `delete()` — check ownership with `findLinkById` first, same pattern as `updateLink()`.

### Previous-Story Intelligence

- **Story 2.5** established the PATCH handler in `src/app/api/v1/links/[id]/route.ts`. Add the DELETE handler in the same file as a separate exported function.
- **Story 2.5** pattern: auth check → try/catch → call db function → handle null → return response. Follow the identical pattern for DELETE, minus the request body parsing.
- **Story 2.5** had 180 tests passing. Maintain this quality bar.
- **Story 2.5** code review fixed a stale logger key. Use `"links.delete.unexpected_error"` as the logger key.
- **Story 2.5** `updateLink()` pattern: call `findLinkById()` first for ownership check, then perform the operation. `deleteLink()` should follow this exact same pattern.
- The existing `route.ts` imports: `NextResponse`, `errorResponse`, `successResponse`, `toLinkResponse`, `auth`, `updateLink`, `AppError`, `logger`, `fieldErrorsFromZod`, `updateLinkSchema`. DELETE handler only needs: `NextResponse`, `errorResponse`, `auth`, `deleteLink`, `AppError`, `logger`. Do NOT import unnecessary items for the DELETE handler — the shared imports are fine in the same file.

### Git Intelligence

Recent commits follow `[BMAD Phase 4] Story X.Y: Description`. Conventions:
- Functions follow `verbNoun` pattern: `createLink`, `findLinkById`, `updateLink` → add `deleteLink`
- Route handlers are named exports matching HTTP methods: `PATCH`, add `DELETE`
- Test describe blocks: `"DELETE /api/v1/links/[id]"` for the new test suite
- Test files use `describe`/`it` with clear action descriptions

### Project Structure Notes

- All link CRUD operations go through `src/lib/db/links.ts` — no direct Prisma calls from route handlers
- Route handler at `src/app/api/v1/links/[id]/route.ts` handles per-link operations (PATCH, now DELETE)
- The `[id]` route file exports one function per HTTP method
- No middleware or utility files need modification

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.6: Delete Links]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2: Link Management & URL Shortening]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Naming Conventions — DELETE method, 204 response]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Response Formats — 204 (deleted, no body)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication Flow]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries]
- [Source: _bmad-output/implementation-artifacts/2-5-update-link-target-url.md — route handler pattern, ownership check pattern]
- [Source: prisma/schema.prisma — Link model, no board relations yet]

## Dev Agent Record

### Agent Model Used

- openai/gpt-5.4

### Debug Log References

- `npm test -- src/lib/db/links.test.ts src/app/api/v1/links/[id]/route.test.ts src/components/links/link-library.test.tsx`
- `npm test`
- `npm run lint`

### Completion Notes List

- Added `deleteLink()` ownership-checked hard delete path in `src/lib/db/links.ts` and covered success/not-found/not-owned delete cases in `src/lib/db/links.test.ts`.
- Added `DELETE /api/v1/links/[id]` with auth-first 401, 204 empty-body success, 404 for missing/non-owned/invalid UUID, and logger key `links.delete.unexpected_error` in `src/app/api/v1/links/[id]/route.ts`.
- Added link-library delete UX with `window.confirm`, `DELETE` fetch, local state removal via `onLinkDeleted`, and inline error rendering in `src/components/links/link-library.tsx`.
- Added route and component coverage for delete flows; full suite passed at 189 passed, 8 skipped; eslint passed.

### File List

- src/lib/db/links.ts
- src/lib/db/links.test.ts
- src/app/api/v1/links/[id]/route.ts
- src/app/api/v1/links/[id]/route.test.ts
- src/components/links/link-library.tsx
- src/components/links/link-library.test.tsx

## Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.6 | **Date:** 2026-03-18 | **Outcome:** Approved with fixes applied

### Issues Found and Fixed

1. **[HIGH → FIXED] Story status never updated** — Status was `ready-for-dev` despite all work being done. Updated to `review` (linter hook) then `done`.
2. **[HIGH → FIXED] Task checkboxes never checked** — All `[ ]` items marked `[x]` to match implementation.
3. **[MEDIUM → FIXED] No test for network error on delete** — Added test for `fetch` rejection in `link-library.test.tsx` covering the `catch` branch in `handleDelete`.
4. **[MEDIUM → FIXED] Fragile UUID error detection in DELETE handler** — Changed `error.message.toLowerCase().includes("uuid")` to `error.name === "PrismaClientValidationError"` in `route.ts:86`. Updated corresponding test to use correct error name.

### Issues Noted (not fixed)

5. **[MEDIUM] TOCTOU race in `deleteLink`** — `findLinkById` + `prisma.link.delete` is two queries; a concurrent delete between them would cause an unhandled `P2025` error (500). Same pre-existing pattern as `updateLink`. Race window is minimal. Not fixing per story anti-pattern notes ("Do NOT catch Prisma P2025").
6. **[LOW] `_request` naming inconsistency** — DELETE uses `_request` while PATCH uses `request`. Cosmetic only.
7. **[LOW] No per-link `aria-label` on Delete/Edit buttons** — Pre-existing accessibility gap, not introduced by this story.

### AC Validation

| AC | Status | Evidence |
|---|---|---|
| AC1 — DELETE returns 204, link removed | ✅ IMPLEMENTED | `route.ts:84`, `links.ts:46-58` |
| AC2 — Deleted link returns 404 | ✅ IMPLEMENTED | `links.test.ts:157-158` verifies find returns null |
| AC3 — Non-owned returns 404 (not 403) | ✅ IMPLEMENTED | `route.test.ts:548-569`, `links.ts:49-50` |
| AC4 — Unauthenticated returns 401 | ✅ IMPLEMENTED | `route.ts:66-71`, `route.test.ts:571-588` |
| AC5 — Invalid UUID returns 404 | ✅ IMPLEMENTED | `route.ts:86`, `route.test.ts:590-613` |
| AC6 — Delete UI with confirmation | ✅ IMPLEMENTED | `link-library.tsx:157-188`, 6 component tests |

### Test Results

190 passed, 8 skipped (DB integration tests — no local DB). All pre-existing Story 2.1–2.5 tests continue passing.

## Change Log

- 2026-03-18: Implemented Story 2.6 delete flow across db, API, and link library UI with coverage for success, 401, 404, confirmation, and list removal.
- 2026-03-18: Code review — fixed 4 issues: story status/tasks not updated, missing network error test, fragile UUID error detection in DELETE handler.
