# Story 2.3: Link Metadata Management

Status: done

## Story

As a logged-in user,
I want to add a title, description, and tags to my links,
so that I can organize and identify my links easily.

## Acceptance Criteria

1. **Given** I am creating or editing a link, **When** I provide a title, description, and/or tags, **Then** the metadata is saved with the link (`title: string`, `description: text`, `tags: string[]`).

2. **Given** I am creating or editing a link, **When** I leave title, description, and tags empty, **Then** the link is still saved successfully with just a target URL (existing Story 2.1/2.2 behavior preserved).

3. **Given** I view my links in the link library, **When** a link has metadata, **Then** the link card displays the title, description, and tags.

4. **Given** I am not authenticated, **When** I try to create or edit a link, **Then** I receive a 401 error.

## Tasks / Subtasks

- [x] Extend link validation schemas for metadata input (AC: #1, #2)
  - [x] Update `src/lib/validations/link.ts` to add optional `title`, `description`, and `tags` fields to `createLinkSchema`
  - [x] Add reusable metadata field schemas for trimmed optional title/description and normalized tag arrays
  - [x] Add `updateLinkMetadataSchema` for PATCH requests with all metadata fields optional
  - [x] Preserve existing `targetUrl` + `customSlug` validation behavior from Stories 2.1/2.2
  - [x] Update `src/lib/validations/link.test.ts` with metadata validation coverage

- [x] Extend link data access for metadata persistence (AC: #1, #2)
  - [x] Update `src/lib/db/links.ts` `CreateLinkData` type to include optional `title`, `description`, and `tags`
  - [x] Update `createLink()` to persist metadata fields on create
  - [x] Add `findLinkById(id: string, userId: string)` helper scoped to owner
  - [x] Add `updateLink(id: string, userId: string, data)` helper for metadata-only PATCH updates

- [x] Update POST `/api/v1/links` to accept metadata (AC: #1, #2, #4)
  - [x] Extend `src/app/api/v1/links/route.ts` POST handler to pass metadata to `createLink()`
  - [x] Keep `auth()` as the first operation
  - [x] Keep response wrapper format `{ data }` / `{ error }`
  - [x] Return metadata fields in the 201 response payload
  - [x] Update `src/app/api/v1/links/route.test.ts` for metadata create scenarios and unauthenticated 401 behavior

- [x] Add PATCH `/api/v1/links/[id]` metadata update route (AC: #1, #4)
  - [x] Create `src/app/api/v1/links/[id]/route.ts`
  - [x] Support metadata edits for `title`, `description`, and `tags` only
  - [x] Validate request body with `updateLinkMetadataSchema`
  - [x] Verify ownership and return 404 for missing/not-owned links
  - [x] Return updated link in `{ data }` wrapper
  - [x] Create `src/app/api/v1/links/[id]/route.test.ts` for happy path, partial update, validation failure, 401, and 404 cases

- [x] Surface metadata in UI create/edit flows (AC: #1, #2)
  - [x] Update `src/components/links/create-link-form.tsx` to add optional title input, description textarea, and tags input
  - [x] Keep metadata fields optional with clear helper copy
  - [x] Serialize tags input into normalized string array before submit
  - [x] Extend current success handling without regressing custom slug UX
  - [x] Update `src/components/links/create-link-form.test.tsx` for field rendering and metadata submission

- [x] Display metadata in the link library (AC: #3)
  - [x] Update the link library card/list rendering component introduced for the library view so title, description, and tags appear when present
  - [x] If no dedicated card component exists yet, implement the smallest library UI change needed in the current links page/components without expanding Story 2.8 scope
  - [x] Ensure metadata display is accessible and does not rely on color alone
  - [x] Add/extend component tests covering conditional metadata rendering

## Dev Notes

### Architecture Compliance

- **Auth first** — use `auth()` from `@/lib/auth/config` as the first operation in create/update route handlers. [Source: architecture.md#Authentication Flow]
- **Versioned API** — all routes remain under `/api/v1/`. [Source: architecture.md#API Naming Conventions]
- **PATCH for updates** — metadata edits use PATCH, not PUT. [Source: architecture.md#API Naming Conventions]
- **Thin route handlers** — validate, call `lib/db`, format response. [Source: architecture.md#Data Boundaries]
- **Zod at the boundary** — metadata validation belongs in `src/lib/validations/link.ts`. [Source: architecture.md#Validation Pattern]
- **Response wrapper discipline** — use `successResponse()` / `errorResponse()`. [Source: architecture.md#API Response Formats]
- **Structured logging only** — use `logger`, never `console.log`. [Source: architecture.md#Logging Pattern]
- **Co-located tests** — keep `*.test.ts` adjacent to the touched source files. [Source: architecture.md#Structure Patterns]

### Technical Requirements

- The Prisma `Link` model already contains `title`, `description`, and `tags`; **no migration is needed**.
- `title` should be optional, trimmed, and bounded to a practical UI-safe max length.
- `description` should be optional, trimmed, and stored as text.
- `tags` should be optional and stored as a normalized `string[]` in the existing Postgres array column.
- Normalize tags before persistence:
  - trim whitespace
  - lowercase for consistent filtering/display
  - drop empty entries
  - deduplicate
  - enforce a small max tag count to keep cards readable
- PATCH route scope is metadata only for this story. Do not expand into target URL editing, expiration, deletion, analytics, or board assignment.
- Wrong-owner edits should return 404 rather than 403 to avoid leaking resource existence.

### File / Technical Scope

Files to **modify**:
- `src/lib/validations/link.ts`
- `src/lib/validations/link.test.ts`
- `src/lib/db/links.ts`
- `src/app/api/v1/links/route.ts`
- `src/app/api/v1/links/route.test.ts`
- `src/components/links/create-link-form.tsx`
- `src/components/links/create-link-form.test.tsx`
- existing link library display component/page used to render user links

Files to **create**:
- `src/app/api/v1/links/[id]/route.ts`
- `src/app/api/v1/links/[id]/route.test.ts`

### Testing Requirements

- Validation tests for optional metadata, trimming, tag normalization, deduplication, invalid tags, and empty metadata.
- POST route tests for create-with-metadata, create-without-metadata, backward compatibility with existing create flow, and 401 unauthenticated access.
- PATCH route tests for updating title/description/tags, partial updates, 401 unauthenticated, 404 missing/not-owned, and validation errors.
- UI tests for rendering metadata inputs, metadata submission payloads, and optional-field behavior.
- Library rendering tests for displaying metadata only when present.
- Existing Story 2.1/2.2 tests must continue passing.

### Anti-Patterns to Avoid

- Do NOT add a database migration.
- Do NOT create a separate metadata table or tag model.
- Do NOT create `/api/v1/links/[id]/metadata` — metadata belongs on the link resource.
- Do NOT bundle in target URL editing (Story 2.5), expiration (Story 2.4), deletion (Story 2.6), redirect logic (Story 2.7), or full library/search scope (Story 2.8).
- Do NOT make metadata required.
- Do NOT duplicate validation helpers or response helpers.
- Do NOT expose ownership differences with 403 responses.

### Previous-Story Intelligence

- **Story 2.1:** POST `/api/v1/links` already handles authenticated link creation with auto-generated slugs; preserve that path.
- **Story 2.2:** `customSlug` support, route response shape, validation helper usage, and generated-slug retry behavior are already in place; extend them without restructuring the create flow.
- Blank/whitespace optional-field preprocessing introduced in prior work is the right pattern for title/description/tags inputs.
- The create form already uses `react-hook-form` + Zod resolver, so schema additions should integrate cleanly.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3: Link Metadata Management]
- [Source: _bmad-output/planning-artifacts/prd.md#FR3]
- [Source: _bmad-output/planning-artifacts/prd.md#FR27-FR30]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Naming Conventions]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Response Formats]
- [Source: _bmad-output/planning-artifacts/architecture.md#Validation Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication Flow]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Logging Pattern]
- [Source: _bmad-output/implementation-artifacts/2-2-custom-slug-support-and-validation.md]

## Dev Agent Record

### Agent Model Used

GPT-5.4 fallback subagent

### Debug Log References

- Fallback create-story artifact produced because the Claude ACP create-story session for Story 2.3 was non-responsive.

### Completion Notes List

- Added optional title, description, and normalized tag validation for create and metadata PATCH flows.
- Extended link persistence helpers and POST /api/v1/links to store and return metadata without regressing Story 2.1/2.2 create behavior.
- Added PATCH /api/v1/links/[id] for owner-scoped metadata updates with 401/404/validation coverage.
- Updated the create form and links library UI to capture and display metadata with focused component tests.
- Targeted vitest coverage passed; DB helper integration tests remain skipped locally when the link table is unavailable.

### Code Review Fixes (Claude Opus 4.6)

- **H1 FIXED**: PATCH endpoint now supports clearing metadata — `null` or `""` for title/description sets to `null`; empty `[]` for tags clears all tags. Added nullable schemas (`nullableTitleSchema`, `nullableDescriptionSchema`, `nullableTagsSchema`) for the update path.
- **H2 FIXED**: Extracted duplicated `toLinkResponse` to shared `src/lib/api-response.ts`, imported by both route files.
- **M1 FIXED**: Removed redundant `findLinkById` call in PATCH handler — `updateLink()` already performs ownership check internally. Reduced from 3 queries to 2.
- **M2 FIXED**: Replaced `as never` type cast on tags input with properly typed default value.
- **M3 FIXED**: `normalizeTags` now returns `undefined` for non-array/non-string inputs instead of leaking raw values.
- **L1 FIXED**: Added PATCH route tests for empty body rejection and metadata clearing via `null`/`[]`.
- Added 5 new tests (3 validation, 2 route). All 144 tests pass.

### File List

- `_bmad-output/implementation-artifacts/2-3-link-metadata-management.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/lib/api-response.ts`
- `src/app/(dashboard)/links/page.tsx`
- `src/app/api/v1/links/route.ts`
- `src/app/api/v1/links/route.test.ts`
- `src/app/api/v1/links/[id]/route.ts`
- `src/app/api/v1/links/[id]/route.test.ts`
- `src/components/links/create-link-form.tsx`
- `src/components/links/create-link-form.test.tsx`
- `src/components/links/link-library.tsx`
- `src/components/links/link-library.test.tsx`
- `src/lib/db/links.ts`
- `src/lib/db/links.test.ts`
- `src/lib/validations/link.ts`
- `src/lib/validations/link.test.ts`
