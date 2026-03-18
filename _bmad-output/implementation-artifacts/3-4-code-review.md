# Code Review — Story 3.4: Reorder Links Within a Board

**Reviewer:** Amelia (ACP)
**Status:** Pass with low-priority follow-ups
**Verification:** lint clean; test suite green (322 passed, 8 skipped in reviewer context)

## Acceptance Criteria Coverage
- **AC1: Reorder via controls** — PASS. Move up/down controls and optimistic reorder handling are implemented in `src/components/boards/board-link-add.tsx`.
- **AC2: Persistence** — PASS. `PATCH /api/v1/boards/[id]/links/reorder` persists ordering through `reorderBoardLinks` in `src/lib/db/board-links.ts`.
- **AC3: Ownership enforcement** — PASS. Route rejects unauthorized access by checking board ownership before reorder.
- **AC4: Validation** — PASS. Payload validation plus exact set matching rejects missing, duplicate, or extra IDs.

## Review Findings
1. **Medium — response typing is overly broad**
   - `src/components/boards/board-link-add.tsx`
   - The shared `MutationResponse` union is harder to narrow than necessary for reorder responses.
   - Recommendation: split response types (for add-link vs reorder) or add an explicit assertion after the array guard.

2. **Low — transaction helper pattern is not ideal**
   - `src/lib/db/board-links.ts`
   - `reorderBoardLinks` builds Prisma update operations eagerly before `$transaction([...])`.
   - This matches an existing project pattern and is not a regression, but it is worth tightening later.

3. **Low — duplicate ID validation could move closer to schema**
   - `src/lib/validations/board.ts`
   - Duplicate IDs are currently rejected in the route-level exact-set check, which is correct.
   - Recommendation: add a schema-level refine for clearer field errors.

## Outcome
- No blocking defects found.
- Story 3.4 is acceptable to merge/commit as implemented.
- Follow-ups above can be handled as cleanup work; they do not block story completion.
