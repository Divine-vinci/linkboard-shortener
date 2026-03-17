# Story 2.4: Link Expiration

Status: done

## Story

As a logged-in user,
I want to set an optional expiration date/time on my short link,
so that temporary links automatically stop working after their intended use period.

## Acceptance Criteria

1. **Given** I am creating a link, **When** I set an expiration date/time, **Then** the `expiresAt` timestamp is saved on the link record.

2. **Given** I am editing a link, **When** I set or change the expiration date/time, **Then** the `expiresAt` timestamp is updated on the link record.

3. **Given** I am editing a link with an existing expiration, **When** I clear the expiration, **Then** `expiresAt` is set to `null` (link never expires).

4. **Given** I do not set an expiration, **When** I create the link, **Then** the link never expires (`expiresAt` is `null`).

5. **Given** I view my links in the link library, **When** a link has expired (`now > expiresAt`), **Then** the link card shows an "Expired" indicator.

6. **Given** I view my links in the link library, **When** a link has a future expiration, **Then** the link card shows the expiration date.

7. **Given** I am not authenticated, **When** I try to set expiration on a link, **Then** I receive a 401 error.

## Tasks / Subtasks

- [ ] Add expiration validation schemas (AC: #1, #2, #3, #4)
  - [ ] Add `optionalExpiresAtSchema` to `src/lib/validations/link.ts` — optional ISO 8601 datetime string, must be in the future when provided, transforms to `Date` object
  - [ ] Add `expiresAt` field to `createLinkSchema`
  - [ ] Create `updateLinkExpirationSchema` extending `updateLinkMetadataSchema` to also accept `expiresAt` (nullable — `null` clears expiration)
  - [ ] Update `src/lib/validations/link.test.ts` with expiration validation tests: valid future date, past date rejection, null clears, undefined skips, invalid format rejection

- [ ] Extend link data access for expiration persistence (AC: #1, #2, #3, #4)
  - [ ] Update `CreateLinkData` type in `src/lib/db/links.ts` to include optional `expiresAt: Date | null`
  - [ ] Update `UpdateLinkData` type to include optional `expiresAt: Date | null`
  - [ ] Verify `createLink()` and `updateLink()` already pass through extra fields to Prisma (they should, since Prisma schema has `expiresAt`)
  - [ ] Add `src/lib/db/links.test.ts` coverage for create/update with expiration values

- [ ] Update POST `/api/v1/links` to accept `expiresAt` (AC: #1, #4, #7)
  - [ ] Extend POST handler in `src/app/api/v1/links/route.ts` to pass validated `expiresAt` to `createLink()`
  - [ ] Return `expiresAt` in the 201 response payload (ISO 8601 string or `null`)
  - [ ] Update `src/app/api/v1/links/route.test.ts` with expiration create scenarios: with future date, without expiration, with past date (400)

- [ ] Update PATCH `/api/v1/links/[id]` to accept `expiresAt` (AC: #2, #3, #7)
  - [ ] Update PATCH handler in `src/app/api/v1/links/[id]/route.ts` to use `updateLinkExpirationSchema` (superset of current metadata schema)
  - [ ] Support setting, changing, and clearing (`null`) expiration
  - [ ] Return updated `expiresAt` in response payload
  - [ ] Update `src/app/api/v1/links/[id]/route.test.ts` with expiration update scenarios: set expiration, change expiration, clear expiration (`null`), past date rejection (400)

- [ ] Add expiration UI to create link form (AC: #1, #4)
  - [ ] Add optional date/time input to `src/components/links/create-link-form.tsx` after existing metadata fields
  - [ ] Use a native `<input type="datetime-local" />` or a shadcn/ui date picker if available — keep it minimal
  - [ ] Serialize the datetime value to ISO 8601 string before API submission
  - [ ] Ensure empty/unset expiration sends `undefined` (not `null`) to API on create
  - [ ] Update `src/components/links/create-link-form.test.tsx` for expiration input rendering and submission

- [ ] Display expiration status in link library (AC: #5, #6)
  - [ ] Update the link library card component to show expiration info
  - [ ] If `expiresAt` exists and is in the past → show "Expired" badge (red/destructive variant)
  - [ ] If `expiresAt` exists and is in the future → show formatted expiration date (e.g., "Expires Mar 20, 2026")
  - [ ] If `expiresAt` is `null` → show nothing (no expiration)
  - [ ] Add/extend component tests for conditional expiration rendering

## Dev Notes

### Architecture Compliance

- **Auth first** — use `auth()` from `@/lib/auth/config` as the first operation in route handlers. [Source: architecture.md#Authentication Flow]
- **Versioned API** — all routes under `/api/v1/`. [Source: architecture.md#API Naming Conventions]
- **PATCH for updates** — expiration updates use PATCH, not PUT. [Source: architecture.md#API Naming Conventions]
- **Thin route handlers** — validate → call `lib/db` → format response. [Source: architecture.md#Data Boundaries]
- **Zod at the boundary** — expiration validation in `src/lib/validations/link.ts`. [Source: architecture.md#Validation Pattern]
- **Response wrapper** — use `successResponse()` / `errorResponse()`. [Source: architecture.md#API Response Formats]
- **Structured logging** — use `logger`, never `console.log`. [Source: architecture.md#Logging Pattern]
- **Co-located tests** — `*.test.ts` adjacent to source files. [Source: architecture.md#Structure Patterns]
- **Dates as ISO 8601** — `expiresAt` returned as ISO 8601 string in API responses. [Source: architecture.md#Data Exchange Formats]
- **Null for absent optionals** — return explicit `null` for `expiresAt` when not set. [Source: architecture.md#Data Exchange Formats]

### Technical Requirements

- The Prisma `Link` model already has `expiresAt DateTime?` — **no migration needed**.
- `expiresAt` validation must reject past dates on create and on update (when setting a new value). Clearing expiration (`null`) is always allowed.
- The "future date" check should use server time, not client time. Validate in the Zod schema with a custom refinement: `z.coerce.date().refine(d => d > new Date(), { message: "Expiration must be in the future" })`.
- Add a small buffer (e.g., 1 minute) to avoid race conditions where a date passes validation but expires before the response is sent. This is optional but recommended.
- On PATCH, `expiresAt: null` means "remove expiration" (link never expires). `expiresAt: undefined` (field omitted) means "don't change expiration". This mirrors the existing metadata update pattern.
- Expired status is computed client-side by comparing `expiresAt` to `Date.now()` — no database field for "is expired".

### Scope Boundaries

**IN scope for this story:**
- Setting `expiresAt` on link creation (POST)
- Setting/changing/clearing `expiresAt` on link update (PATCH)
- Displaying expiration status in link library UI
- Validation (future date, nullable, ISO format)

**OUT of scope — do NOT implement:**
- Redirect expiration check / "expired" page (Story 2.7 — redirect engine)
- Redis cache storage of `expiresAt` (Story 2.7 — cache pattern `slug:{slug}` → `{targetUrl, linkId, expiresAt}`)
- Automatic cleanup/deletion of expired links (not in any story)
- Expiration filtering/searching in link library (Story 2.8)
- Target URL editing (Story 2.5)
- Link deletion (Story 2.6)

### File / Technical Scope

Files to **modify**:
- `src/lib/validations/link.ts` — add `optionalExpiresAtSchema`, update `createLinkSchema`, create `updateLinkExpirationSchema`
- `src/lib/validations/link.test.ts` — add expiration validation tests
- `src/lib/db/links.ts` — update `CreateLinkData` and `UpdateLinkData` types to include `expiresAt`
- `src/app/api/v1/links/route.ts` — pass `expiresAt` to `createLink()`, include in response
- `src/app/api/v1/links/route.test.ts` — add expiration create scenarios
- `src/app/api/v1/links/[id]/route.ts` — switch to `updateLinkExpirationSchema`, handle `expiresAt` updates
- `src/app/api/v1/links/[id]/route.test.ts` — add expiration update scenarios
- `src/components/links/create-link-form.tsx` — add expiration date/time input
- `src/components/links/create-link-form.test.tsx` — add expiration form tests
- Link library card component (likely `src/components/links/link-library.tsx` or similar) — add expired/expiring indicators

Files to **create**: None expected. All changes extend existing files.

### Testing Requirements

- **Validation tests**: future date accepted, past date rejected, null accepted (clears), undefined accepted (skips), invalid string rejected, non-ISO format rejected.
- **POST route tests**: create with future `expiresAt`, create without `expiresAt` (null in response), create with past `expiresAt` (400 validation error), create with invalid `expiresAt` format (400).
- **PATCH route tests**: set `expiresAt` on link without one, update `expiresAt` to new future date, clear `expiresAt` with `null`, reject past `expiresAt` (400), 401 unauthenticated, 404 not-owned.
- **UI tests**: expiration input renders in create form, expiration value included in form submission, empty expiration omitted from submission.
- **Library tests**: expired link shows "Expired" badge, future-expiring link shows date, no-expiration link shows nothing.
- **Regression**: all existing Story 2.1/2.2/2.3 tests must continue passing. Creating links without expiration must behave identically to current behavior.

### Anti-Patterns to Avoid

- Do NOT add a database migration — `expiresAt` already exists in the Prisma schema.
- Do NOT add a computed `isExpired` column or database field — compute in the application/UI layer.
- Do NOT implement redirect blocking for expired links — that's Story 2.7.
- Do NOT add Redis caching of expiration data — that's Story 2.7.
- Do NOT create a separate expiration management API endpoint (e.g., `/api/v1/links/[id]/expiration`) — expiration belongs on the link resource via the existing PATCH route.
- Do NOT make `expiresAt` required — it must always be optional.
- Do NOT use a date-only picker — expiration needs both date and time precision.
- Do NOT install additional date libraries (like date-fns, dayjs, moment) unless already in the project. Use native `Date` and `Intl.DateTimeFormat` for display formatting.
- Do NOT duplicate validation logic — reuse Zod schema patterns from existing metadata fields.
- Do NOT change the PATCH endpoint path or HTTP method.

### Previous-Story Intelligence

- **Story 2.3** established the PATCH `/api/v1/links/[id]` route with `updateLinkMetadataSchema`. Extend this schema to also accept `expiresAt` rather than creating a new route or separate schema.
- **Story 2.3** pattern for nullable PATCH fields: `null` means "clear the value", `undefined` (omitted) means "don't change". Apply the same pattern for `expiresAt`.
- **Story 2.3** added `updateLink()` in `src/lib/db/links.ts` which already handles partial updates via Prisma. Adding `expiresAt` to the `UpdateLinkData` type should flow through without changing the function body.
- **Story 2.3** uses `react-hook-form` + Zod resolver in the create form. The expiration input should integrate into the same form with the same pattern.
- **Story 2.3 code review** passed all checks (139 tests passed, lint clean, TypeScript clean, build clean). Maintain this quality bar.
- **Story 2.3 dev notes**: DB integration tests are skipped locally when test database is unavailable — this is expected and acceptable.
- **Story 2.3** introduced `link-library.tsx` component for displaying links — update this component for expiration indicators.

### Git Intelligence

Recent commits follow the pattern `[BMAD Phase 4] Story X.Y: Description`. Last commit was Story 2.3 (link metadata management). Code conventions observed:
- Zod schemas use `camelCase` + `Schema` suffix
- Optional field schemas follow `optional{Field}Schema` naming
- PATCH update schemas use `refine()` for "at least one field required" validation
- Test files mirror source structure with `.test.ts` extension

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4: Link Expiration]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.7: Redirect Engine — expires_at in cache pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Exchange Formats — ISO 8601 dates]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Response Formats]
- [Source: _bmad-output/planning-artifacts/architecture.md#Validation Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication Flow]
- [Source: _bmad-output/planning-artifacts/architecture.md#Redis Caching — slug cache includes expiresAt]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries]
- [Source: _bmad-output/implementation-artifacts/2-3-link-metadata-management.md — PATCH route pattern, nullable update fields]
- [Source: prisma/schema.prisma — Link model with expiresAt DateTime?]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

### File List

- src/lib/validations/link.ts
- src/lib/validations/link.test.ts
- src/lib/db/links.ts
- src/lib/db/links.test.ts
- src/lib/api-response.ts
- src/lib/time.ts
- src/app/api/v1/links/route.ts
- src/app/api/v1/links/route.test.ts
- src/app/api/v1/links/[id]/route.ts
- src/app/api/v1/links/[id]/route.test.ts
- src/components/links/create-link-form.tsx
- src/components/links/create-link-form.test.tsx
- src/components/links/link-library.tsx
- src/components/links/link-library.test.tsx
- src/app/(dashboard)/links/page.tsx

## Senior Developer Review (AI)

**Reviewer:** Amelia (Dev) via Claude Opus 4.6
**Date:** 2026-03-17

### Review Summary

**Issues Found:** 1 High, 3 Medium, 3 Low
**Git vs Story Discrepancies:** 1 (new file `src/lib/time.ts` created; story said "Files to create: None expected")
**Outcome:** Approved after fixes

### HIGH Issues (Fixed)

1. **TypeScript compilation failure — `CreateLinkData.expiresAt` type mismatch** `src/lib/db/links.ts:6`
   - `Pick<Link, "expiresAt">` gives required `Date | null`, but POST route handler passes `Date | undefined` from Zod output.
   - `tsc --noEmit` produced 2 errors at `src/app/api/v1/links/route.ts:51` and `:108`.
   - **Fix applied:** Changed `CreateLinkData` from `Pick<Link, "slug" | "targetUrl" | "userId" | "expiresAt">` to `Pick<Link, "slug" | "targetUrl" | "userId"> & { expiresAt?: Date | null }`, making `expiresAt` optional.
   - **Root cause:** Dev agent verified with `npm run lint` + `npm test` but did NOT run `tsc --noEmit`. ESLint and Vitest do not perform full TypeScript type checking. A `next build` would have also caught this.

### MEDIUM Issues (Accepted)

2. **Form datetime-local parsed as local timezone with no UI indicator** `src/components/links/create-link-form.tsx:288`
   - `setValueAs: (value) => new Date(value).toISOString()` converts datetime-local input using the user's local timezone. No label or hint tells the user which timezone applies.
   - Functionally correct (user expects local time), but could confuse users in multi-timezone teams. Acceptable for MVP; consider adding timezone hint in a future story.

3. **`updateLinkMetadataSchema` no longer imported by any route handler** `src/lib/validations/link.ts:194`
   - PATCH route switched to `updateLinkExpirationSchema`. The old `updateLinkMetadataSchema` is only referenced in its own test file.
   - Not dead code (still exported and tested), but no production consumer. Acceptable — may be useful if a metadata-only endpoint is needed later.

4. **Inconsistent Date serialization in `toLinkResponse`** `src/lib/api-response.ts:17`
   - `expiresAt` explicitly calls `.toISOString()`, while `createdAt`/`updatedAt` rely on implicit `JSON.stringify` serialization. Both produce identical ISO strings at runtime, but the inconsistency could mislead future developers.

### LOW Issues (Noted)

5. **New file `src/lib/time.ts` not anticipated by story** — Story stated "Files to create: None expected." A 3-line utility for testability is justified; the story's estimate was simply off.

6. **Type-cast hack in form defaultValues** `src/components/links/create-link-form.tsx:79` — `expiresAt: "" as unknown as Date` works around react-hook-form's type expectations. Functional but fragile if form types change.

7. **POST create rejects `expiresAt: null`** — Sending `null` on create returns 400 instead of treating as "no expiration". Not a real issue (clients should omit the field), but differs from the PATCH null-clears-value pattern.

### AC Verification

| AC | Status | Evidence |
|----|--------|----------|
| #1 Create with expiresAt saved | IMPLEMENTED | POST handler passes expiresAt to createLink; test "creates a link with expiration" |
| #2 Edit expiresAt updated | IMPLEMENTED | PATCH handler accepts expiresAt; test "sets expiration on a link" |
| #3 Clear expiration to null | IMPLEMENTED | PATCH with null; test "clears expiration when null is sent" |
| #4 No expiration = null | IMPLEMENTED | Omit expiresAt on create; test "creates a link and returns 201" |
| #5 Expired link shows Expired | IMPLEMENTED | LinkExpirationBadge; test "shows an expired badge for expired links" |
| #6 Future expiration shows date | IMPLEMENTED | LinkExpirationBadge; test "shows formatted expiration for active links" |
| #7 Unauthenticated = 401 | IMPLEMENTED | Both POST/PATCH test 401 |

### Test Verification

- **163 tests passed**, 5 skipped (DB integration tests — expected when local DB unavailable)
- Lint clean (`npm run lint`)
- TypeScript clean after fix (`tsc --noEmit`)
- New validation tests: 4 (optionalExpiresAtSchema + updateLinkExpirationSchema)
- New route tests: 5 (POST expiration, PATCH set/change/clear/reject)
- New UI tests: 3 (form expiration submission, library expired/active/none badges)
