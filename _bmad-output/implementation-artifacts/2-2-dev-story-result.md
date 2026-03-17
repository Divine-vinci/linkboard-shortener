# Story 2.2: Custom Slug Support and Validation — Implementation Summary

## Status: Complete

## Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

## Changes Made

### 1. `src/lib/validations/link.ts`
- Added `RESERVED_SLUGS` constant with 12 reserved words (`api`, `admin`, `login`, `register`, `dashboard`, `settings`, `b`, `reset-password`, `api-docs`, `health`, `_next`, `favicon.ico`)
- Added `customSlugSchema` with: lowercase normalization, trim, 3-50 char length, regex for `^[a-z0-9]+(?:-[a-z0-9]+)*$` (no leading/trailing/consecutive hyphens), reserved word refine check
- Updated `createLinkSchema` to include optional `customSlug` field (`.optional().or(z.literal(""))`)
- `CreateLinkInput` type auto-updated via Zod inference

### 2. `src/app/api/v1/links/route.ts`
- Extended POST handler: if `customSlug` is provided and non-empty, checks uniqueness via `findLinkBySlug()` and returns 409 if taken
- Falls back to `generateUniqueSlug()` when `customSlug` is empty/missing (preserves Story 2.1 behavior)
- Zod validation catches reserved words and format violations at the schema level (400)

### 3. `src/components/links/create-link-form.tsx`
- Added optional "Custom slug" input field below Target URL
- Shows live slug preview (`{origin}/your-custom-slug`) as user types via `watch("customSlug")`
- Handles 409 CONFLICT error by setting field error on `customSlug`
- Handles server-side field validation errors for `customSlug`
- Omits `customSlug` from request body when empty (preserves auto-generate behavior)
- All form controls keyboard-accessible with visible focus states

### 4. Test files updated
- `src/lib/validations/link.test.ts` — 17 tests covering valid slugs, lowercase normalization, length bounds, hyphen rules, special chars, reserved words, createLinkSchema integration
- `src/app/api/v1/links/route.test.ts` — 9 tests (4 existing + 5 new: custom slug 201, duplicate 409, reserved word 400, invalid format 400, empty fallback to auto-generate)
- `src/components/links/create-link-form.test.tsx` — 7 tests (3 existing + 4 new: renders custom slug input, slug preview, 409 error display, empty slug omits field)

## Test Results

- **35 tests** across the 3 modified test files: all pass
- **Full suite**: 127 passed, 4 skipped (pre-existing DB migration skip), 0 failures

## Files Modified

| File | Action |
|------|--------|
| `src/lib/validations/link.ts` | Modified — added customSlugSchema, RESERVED_SLUGS, updated createLinkSchema |
| `src/lib/validations/link.test.ts` | Modified — added 14 new tests |
| `src/app/api/v1/links/route.ts` | Modified — custom slug handling in POST |
| `src/app/api/v1/links/route.test.ts` | Modified — added 5 new tests |
| `src/components/links/create-link-form.tsx` | Modified — added custom slug input, preview, error handling |
| `src/components/links/create-link-form.test.tsx` | Modified — added 4 new tests |

## Acceptance Criteria Verification

| AC | Status | Notes |
|----|--------|-------|
| #1 Custom slug creation with validation | ✅ | Validated via Zod schema, 201 response with `{ data: link }` |
| #2 Duplicate slug returns 409 | ✅ | Checked via `findLinkBySlug`, returns "Custom slug already exists" |
| #3 Reserved word rejection | ✅ | 12 reserved words, returns 400 field error |
| #4 Empty slug falls back to auto-generate | ✅ | Preserves Story 2.1 behavior |
| #5 Unauthenticated returns 401 | ✅ | Pre-existing, verified by existing test |

## Risks / Follow-ups

- **None identified.** No DB migration needed. All existing tests continue passing. The implementation is minimal and follows established patterns exactly.
