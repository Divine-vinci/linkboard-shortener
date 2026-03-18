# Story 2.5: Update Link Target URL

Status: done

## Story

As a logged-in user,
I want to update the target URL of an existing short link,
so that my shared short URL points to a new destination without breaking.

## Acceptance Criteria

1. **Given** I own a short link, **When** I update its target URL to a new valid URL via PATCH, **Then** the `targetUrl` is updated in the database and the short link slug remains the same (redirect preservation).

2. **Given** I update a link's target URL, **When** the response is returned, **Then** the response includes the updated `targetUrl` along with all other link fields.

3. **Given** I send a PATCH with only `targetUrl`, **When** the server processes it, **Then** only `targetUrl` is updated — all other fields (title, description, tags, expiresAt, slug) remain unchanged.

4. **Given** I send a PATCH with `targetUrl` and other metadata fields, **When** the server processes it, **Then** all provided fields are updated in a single operation.

5. **Given** I send an invalid URL (not http/https, malformed, or empty string), **When** the server validates it, **Then** I receive a 400 error with field-level validation details.

6. **Given** I try to update a link I don't own, **When** the server processes the request, **Then** I receive a 404 error (not 403 — don't leak existence) (NFR13).

7. **Given** I am not authenticated, **When** I try to update a link's target URL, **Then** I receive a 401 error.

## Tasks / Subtasks

- [x] Add `targetUrl` to update validation schema (AC: #1, #3, #4, #5)
  - [x] Create `optionalHttpUrlSchema` in `src/lib/validations/link.ts` — optional version of `httpUrlSchema` that accepts `undefined` (field omitted) but NOT `null` (target URL cannot be cleared)
  - [x] Add `targetUrl: optionalHttpUrlSchema` to `updateLinkFieldsSchema`
  - [x] Update `updateLinkExpirationSchema` refinement to include `targetUrl` in the "at least one field" check
  - [x] Export a new `updateLinkSchema` (rename from `updateLinkExpirationSchema` for clarity) with targetUrl support — OR simply extend the existing schema
  - [x] Update `src/lib/validations/link.test.ts` with targetUrl update validation tests: valid URL accepted, invalid URL rejected, non-http rejected, empty string rejected, null rejected, undefined (omitted) accepted

- [x] Extend link data access for target URL updates (AC: #1, #3)
  - [x] Add `targetUrl?: string` to `UpdateLinkData` type in `src/lib/db/links.ts`
  - [x] Verify `updateLink()` already passes through extra fields to Prisma (it does — no function body changes needed)
  - [x] Add `src/lib/db/links.test.ts` coverage for update with targetUrl value

- [x] Update PATCH `/api/v1/links/[id]` to accept `targetUrl` (AC: #1, #2, #3, #4, #5, #6, #7)
  - [x] The route handler already uses the update schema and passes `parsed.data` to `updateLink()` — if the schema is extended, the handler works without code changes
  - [x] Verify the error message in the route handler ("Invalid link metadata input") is still appropriate — consider updating to "Invalid link update input" since it now covers more than metadata
  - [x] Update `src/app/api/v1/links/[id]/route.test.ts` with target URL update scenarios:
    - Update only targetUrl (200)
    - Update targetUrl + metadata fields together (200)
    - Invalid URL format (400 with field error)
    - Non-http/https URL (400 with field error)
    - Empty string targetUrl (400)
    - Null targetUrl (400 — target URL cannot be cleared)
    - Unauthenticated (401 — already covered but verify)
    - Non-owned link (404 — already covered but verify)

- [x] Add edit target URL UI to link library (AC: #1, #2)
  - [x] Add an "Edit" button/icon on each link card in `src/components/links/link-library.tsx`
  - [x] Create inline edit form or modal for updating the target URL — keep it minimal
  - [x] On submit, call PATCH `/api/v1/links/[id]` with the new `targetUrl`
  - [x] On success, update the displayed target URL (optimistic update or refetch)
  - [x] On error, display the validation error message
  - [x] Add component tests for edit target URL interaction

## Dev Notes

### Architecture Compliance

- **Auth first** — use `auth()` from `@/lib/auth/config` as the first operation in route handlers. [Source: architecture.md#Authentication Flow]
- **Versioned API** — all routes under `/api/v1/`. [Source: architecture.md#API Naming Conventions]
- **PATCH for updates** — target URL updates use PATCH, not PUT. [Source: architecture.md#API Naming Conventions]
- **Thin route handlers** — validate → call `lib/db` → format response. [Source: architecture.md#Data Boundaries]
- **Zod at the boundary** — target URL validation in `src/lib/validations/link.ts`. [Source: architecture.md#Validation Pattern]
- **Response wrapper** — use `successResponse()` / `errorResponse()`. [Source: architecture.md#API Response Formats]
- **Structured logging** — use `logger`, never `console.log`. [Source: architecture.md#Logging Pattern]
- **Co-located tests** — `*.test.ts` adjacent to source files. [Source: architecture.md#Structure Patterns]
- **Null for absent optionals** — but `targetUrl` is NOT nullable (every link must have a target URL). Omitting `targetUrl` from PATCH means "don't change it". [Source: architecture.md#Data Exchange Formats]

### Technical Requirements

- The Prisma `Link` model has `targetUrl String @map("target_url")` — it's a **required** field. Unlike `title`, `description`, or `expiresAt`, `targetUrl` cannot be set to `null`. A link must always have a valid target URL.
- Reuse `httpUrlSchema` for validation (trims whitespace, validates URL format, enforces http/https protocol). Create an optional wrapper for the update schema.
- The `updateLink()` function in `src/lib/db/links.ts` already handles partial updates via Prisma's `data` spread. Adding `targetUrl` to `UpdateLinkData` is sufficient — no function body changes needed.
- The `toLinkResponse()` helper in `src/lib/api-response.ts` already includes `targetUrl` in its output — no changes needed.
- Target URL updates should NOT change the slug. The slug is immutable after creation (unique constraint, not included in update schemas).
- `updatedAt` auto-updates via Prisma's `@updatedAt` directive on any field change.

### Scope Boundaries

**IN scope for this story:**
- Adding `targetUrl` to the PATCH update validation schema
- Adding `targetUrl` to `UpdateLinkData` type
- Testing target URL updates via PATCH endpoint
- Basic edit UI in link library for updating target URL

**OUT of scope — do NOT implement:**
- Redis cache invalidation on target URL change (Story 2.7 — redirect engine with Redis caching not yet built)
- Redirect engine behavior (Story 2.7)
- Link deletion (Story 2.6)
- Slug modification/changing (slugs are immutable)
- Bulk URL updates
- URL change history/audit log
- URL validation beyond format (no reachability/liveness checks)

### File / Technical Scope

Files to **modify**:
- `src/lib/validations/link.ts` — add `optionalHttpUrlSchema`, extend `updateLinkFieldsSchema` with `targetUrl`
- `src/lib/validations/link.test.ts` — add target URL update validation tests
- `src/lib/db/links.ts` — add `targetUrl` to `UpdateLinkData` type
- `src/app/api/v1/links/[id]/route.ts` — update error message text (optional, minor)
- `src/app/api/v1/links/[id]/route.test.ts` — add target URL update scenarios
- `src/components/links/link-library.tsx` — add edit target URL UI
- `src/components/links/link-library.test.tsx` — add edit UI tests

Files to **create**: None expected. All changes extend existing files.

### Testing Requirements

- **Validation tests**: valid http URL accepted, valid https URL accepted, invalid URL rejected, non-http protocol rejected (ftp://), empty string rejected, null rejected (targetUrl is not nullable), undefined accepted (field omitted means no change).
- **PATCH route tests**: update only targetUrl (200, verify response), update targetUrl + title together (200), invalid URL format (400 with field error), non-http URL (400), empty string (400), null targetUrl (400), slug unchanged after update (verify in response), 401 unauthenticated, 404 not-owned.
- **UI tests**: edit button renders on link card, clicking edit shows input with current URL, submitting calls PATCH API, successful update displays new URL, validation error displayed on failure.
- **Regression**: all existing Story 2.1–2.4 tests must continue passing. Existing PATCH metadata/expiration updates must behave identically.

### Anti-Patterns to Avoid

- Do NOT make `targetUrl` nullable in the update schema — every link must have a target URL. Use optional (can omit from PATCH) but not nullable (cannot set to `null`).
- Do NOT add a separate endpoint for target URL updates (e.g., `/api/v1/links/[id]/target`) — it belongs on the existing PATCH resource endpoint.
- Do NOT modify the slug when updating the target URL — slugs are immutable.
- Do NOT implement Redis cache invalidation — the Redis caching layer doesn't exist yet (Story 2.7).
- Do NOT add URL reachability/liveness checks — just validate format.
- Do NOT create a separate update form component for target URL if it can be handled inline in the link library card.
- Do NOT change the PATCH endpoint path or HTTP method.
- Do NOT install additional libraries for URL validation — the existing `httpUrlSchema` with Zod is sufficient.

### Previous-Story Intelligence

- **Story 2.4** extended `updateLinkFieldsSchema` with `expiresAt` and created `updateLinkExpirationSchema`. Extend this same pattern to include `targetUrl`.
- **Story 2.4** code review found a TypeScript compilation issue with `CreateLinkData` types. Ensure `UpdateLinkData` type extension is correct — `targetUrl` should be `targetUrl?: string` (optional string, NOT nullable).
- **Story 2.4** pattern for the "at least one field" refinement: check all fields including the new `targetUrl`. Follow the same `value.targetUrl !== undefined ||` pattern.
- **Story 2.3** established the PATCH route handler pattern with `updateLink()`. The handler already passes `parsed.data` to `updateLink()` — if the schema and type are extended, the handler works without code changes.
- **Story 2.4** had 163 tests passing. Maintain this quality bar.
- **Story 2.4 code review** noted that `updateLinkMetadataSchema` is no longer imported by any route handler. This is still the case — it may be cleaned up later.

### Git Intelligence

Recent commits follow the pattern `[BMAD Phase 4] Story X.Y: Description`. Last commit was Story 2.4 (link expiration). Code conventions observed:
- Zod schemas use `camelCase` + `Schema` suffix
- Optional field schemas follow `optional{Field}Schema` naming
- PATCH update schemas use `refine()` for "at least one field required" validation
- Test files mirror source structure with `.test.ts` extension
- Test assertions use `expect.objectContaining()` for partial response checks

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.5: Update Link Target URL]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.7: Redirect Engine — cache invalidation on URL change]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Naming Conventions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Validation Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication Flow]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Exchange Formats]
- [Source: _bmad-output/implementation-artifacts/2-4-link-expiration.md — schema extension pattern, PATCH test patterns]
- [Source: _bmad-output/implementation-artifacts/2-3-link-metadata-management.md — PATCH route handler, UpdateLinkData type]
- [Source: prisma/schema.prisma — Link model with targetUrl String required]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- src/lib/validations/link.ts
- src/lib/validations/link.test.ts
- src/lib/db/links.ts
- src/lib/db/links.test.ts
- src/app/api/v1/links/[id]/route.ts
- src/app/api/v1/links/[id]/route.test.ts
- src/components/links/link-library.tsx
- src/components/links/link-library.test.tsx

### Change Log

- 2026-03-17: Implementation completed by dev agent
- 2026-03-17: Code review by Amelia (adversarial review agent)

## Senior Developer Review (AI)

**Reviewer:** Amelia (Code Review Agent) — 2026-03-17
**Outcome:** Approved (after fixes applied)

### Issues Found & Fixed (6 fixed, 2 low deferred)

**FIXED — H1 [HIGH] Empty-string targetUrl returned form-level error instead of field-level (AC #5 violation)**
- `optionalHttpUrlSchema` used `emptyStringToUndefined` preprocessor, converting `""` to `undefined` (field omitted) instead of a validation error
- Fix: Removed `emptyStringToUndefined` preprocessor so `httpUrlSchema` validates empty/whitespace strings directly → now returns `{ fields: { targetUrl: "Target URL is required" } }`
- Also fixes whitespace-only strings (`"   "`) which were silently treated as "no change"
- Updated validation tests and route tests to expect field-level error

**FIXED — H2 [HIGH] Stale logger key**
- `route.ts:54` used `"links.update_metadata.unexpected_error"` from old metadata-only handler
- Fix: Updated to `"links.update.unexpected_error"`

**FIXED — M1 [MEDIUM] Missing aria-describedby on edit input**
- Edit form input had `aria-invalid` but no `aria-describedby` pointing to error messages
- Fix: Added `id` attributes to error `<p>` elements and `aria-describedby` on the input

**FIXED — M2 [MEDIUM] Dead updateLinkExpirationSchema alias**
- `updateLinkExpirationSchema = updateLinkSchema` was a misleading alias not imported anywhere
- Fix: Removed alias and its type exports (`UpdateLinkExpirationSchemaInput`, `UpdateLinkExpirationInput`)

**FIXED — C1/C2 [CRITICAL] Story status and task completion not updated**
- Status was `ready-for-dev`, all tasks `[ ]` despite implementation being complete
- Fix: Updated status to `done`, marked all tasks `[x]`

**DEFERRED — L1 [LOW] No protection against submitting unchanged URL**
**DEFERRED — L2 [LOW] noValidate disables browser-native URL validation**

### AC Verification

| AC | Status | Evidence |
|----|--------|----------|
| #1 | IMPLEMENTED | `route.test.ts:42-69` — PATCH updates targetUrl, slug preserved |
| #2 | IMPLEMENTED | `route.test.ts:63-68` — response includes all fields |
| #3 | IMPLEMENTED | `route.test.ts:42-69` — targetUrl-only update, `link.test.ts:274-278` |
| #4 | IMPLEMENTED | `route.test.ts:71-102` — targetUrl + metadata in one request |
| #5 | IMPLEMENTED | `route.test.ts:269-381` — malformed, non-http, empty, null all return 400 with field errors |
| #6 | IMPLEMENTED | `route.test.ts:479-501` — returns 404 for non-owned link |
| #7 | IMPLEMENTED | `route.test.ts:441-459` — returns 401 for unauthenticated |

### Test Results

180 passed, 5 skipped (DB CRUD tests — DB unavailable in CI). All regression tests pass.
