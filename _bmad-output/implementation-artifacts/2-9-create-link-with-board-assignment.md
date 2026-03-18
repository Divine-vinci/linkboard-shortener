# Story 2.9: Create Link with Board Assignment

Status: ready-for-dev

## Story

As a logged-in user,
I want to create a link and assign it to a board in one action,
so that I can organize links into boards without extra steps.

## Acceptance Criteria

1. **Given** I am on the link creation form, **When** I provide a target URL and select a board from a dropdown of my boards, **Then** the link is created and added to the selected board in a single operation.

2. **Given** the selected board does not exist or is not owned by me, **When** I submit the form, **Then** the request fails safely with a validation/ownership error and no partial link-board assignment is created.

3. **Given** I create a link without selecting a board, **When** I submit the form, **Then** the link is created in my library with no board assignment.

4. **Given** board creation is handled separately in Epic 3, **When** I use the link form, **Then** I can only choose from existing boards and cannot create a new board inline.

## Tasks / Subtasks

- [ ] Extend link creation UI for optional board assignment (AC: #1, #3, #4)
  - [ ] Update `src/components/links/create-link-form.tsx` to load/render an optional board dropdown
  - [ ] Preserve current create-link metadata fields and success states
  - [ ] Keep the board selector optional and clearly labeled
  - [ ] Do not add inline board creation UX

- [ ] Add board lookup support for the current user (AC: #1, #4)
  - [ ] Create `src/lib/db/boards.ts` with a minimal query to list selectable boards owned by a user
  - [ ] Return only fields needed for selection (`id`, `name`, optional `slug` if useful for labels)
  - [ ] Add tests for the board lookup helper

- [ ] Extend validation and API contract for optional board assignment (AC: #1, #2, #3)
  - [ ] Update `src/lib/validations/link.ts` to accept optional `boardId`
  - [ ] Update `src/app/api/v1/links/route.ts` POST handling to parse and validate optional `boardId`
  - [ ] Return field-level validation errors when `boardId` is invalid

- [ ] Create link + board membership in one transactional operation (AC: #1, #2, #3)
  - [ ] Extend `src/lib/db/links.ts` `createLink()` path to optionally associate the new link with a board in the same transaction
  - [ ] Verify board ownership before creating the association
  - [ ] If `boardId` is absent, preserve current create-link behavior
  - [ ] If association fails, avoid leaving behind a partially-created inconsistent result

- [ ] Add/confirm board-link persistence support (AC: #1, #2)
  - [ ] Reuse existing schema/models if `boards` and `board_links` already exist
  - [ ] If missing, implement only the minimum schema support required for board assignment and note any migration dependency explicitly
  - [ ] Maintain board-link ordering defaults sensibly (append/newest-last unless existing architecture dictates otherwise)

- [ ] Test the end-to-end story flow (AC: all)
  - [ ] Update `src/components/links/create-link-form.test.tsx` for optional board selection
  - [ ] Update `src/app/api/v1/links/route.test.ts` for successful board assignment, invalid board, and no-board cases
  - [ ] Add/extend DB tests covering transactional create + assignment behavior
  - [ ] Run regression checks for existing link creation behavior

## Dev Notes

### Architecture Compliance

- Link creation remains centered in `app/api/v1/links/route.ts` and `lib/db/links.ts`. Keep route handlers thin and business/data rules in the DB layer. [Source: architecture.md lines 196, 750]
- Board ownership and associations belong in the relational model (`users`, `links`, `boards`, `board_links`). [Source: architecture.md lines 141, 289]
- Board/link association behavior should align with the architecture boundary for board-link features in `lib/db/boards.ts` and board-related API surfaces. [Source: architecture.md lines 589, 654-656]
- Use structured logger patterns and existing validation helpers instead of ad hoc error handling. Reuse current response/error conventions from the links API.

### Existing Code to Reuse

- `src/components/links/create-link-form.tsx` already submits link creation payloads and handles field-level errors.
- `src/app/api/v1/links/route.ts` already validates and creates links; extend the existing POST path rather than creating a separate endpoint.
- `src/lib/db/links.ts#createLink()` is the current persistence entry point for link creation.
- `src/lib/validations/link.ts` is the source of truth for link input validation.
- Story 2.8 added stronger link-library UX and query validation conventions; keep naming and test style consistent.

### Technical Guidance

- Board selection must be optional.
- Ownership must be enforced server-side even if the UI only shows owned boards.
- Prefer a single DB transaction for "create link + optional board assignment".
- Avoid introducing inline board creation here; that belongs to Epic 3.
- If the current Prisma schema does not yet expose `boards` / `board_links`, treat that as a local implementation dependency to satisfy before AC #1 can pass.

### Scope Boundaries

**In scope**
- Optional board selector in link creation flow
- Validation/API support for optional `boardId`
- Transactional link creation with optional board assignment
- Tests for success, invalid ownership, and no-board behavior

**Out of scope**
- Board creation/edit/delete UX
- Board detail pages
- Reordering links within boards
- Public board rendering
- Analytics changes

### Risks / Implementation Notes

- Story order is slightly ahead of Epic 3 board-management UX. The implementation may need minimal board data-access/schema support before the broader board experience exists.
- If board schema pieces are absent, implement the smallest safe foundation needed for assignment and document the dependency in the dev result.

### Suggested Files

Files likely to **modify**:
- `src/components/links/create-link-form.tsx`
- `src/components/links/create-link-form.test.tsx`
- `src/app/api/v1/links/route.ts`
- `src/app/api/v1/links/route.test.ts`
- `src/lib/validations/link.ts`
- `src/lib/validations/link.test.ts`
- `src/lib/db/links.ts`
- `src/lib/db/links.test.ts`

Files likely to **create**:
- `src/lib/db/boards.ts`
- `src/lib/db/boards.test.ts`
- Any minimal Prisma migration/schema updates required for board assignment support

## Definition of Done

- Story file exists and is implementation-ready
- Board assignment requirements and boundaries are explicit
- Dependencies/risks are called out
- The story is ready for the dev-story workflow
