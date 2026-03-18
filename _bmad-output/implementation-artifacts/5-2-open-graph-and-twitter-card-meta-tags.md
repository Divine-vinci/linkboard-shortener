# Story 5.2: Open Graph and Twitter Card Meta Tags

Status: ready-for-dev

## Story

As a user sharing a public board on social media,
I want rich link previews with title, description, and image,
So that my shared boards look professional and attract clicks.

## Acceptance Criteria

1. **Given** a public board exists
   **When** the SSR page is rendered
   **Then** `generateMetadata()` produces Open Graph meta tags: `og:title` (board name), `og:description` (board description), `og:image` (default OG image at `/og-default.png`), `og:url` (canonical board URL), `og:type` ("website")
   **And** Twitter Card meta tags: `twitter:card` ("summary_large_image"), `twitter:title`, `twitter:description`, `twitter:image`

2. **Given** a social media crawler (Facebook, Twitter, Slack) fetches the board URL
   **When** the response is parsed
   **Then** the rich preview displays correctly with the board's title, description, and default OG image

3. **Given** a short link redirect page (e.g., `/expired`)
   **When** the page is rendered
   **Then** the page includes `noindex, nofollow` meta robots directives so redirect/utility pages are NOT indexed by search engines

## Tasks / Subtasks

- [ ] Task 1: Create default OG image (AC: #1, #2)
  - [ ] Create `public/og-default.png` — a 1200x630px branded OG image with Linkboard logo/name
  - [ ] Use a simple programmatic approach (e.g., sharp or canvas in a script) or provide a static placeholder PNG

- [ ] Task 2: Enhance `generateMetadata()` in public board page (AC: #1, #2)
  - [ ] Update `src/app/(public)/b/[slug]/page.tsx` `generateMetadata()` to include `og:image` pointing to `/og-default.png`
  - [ ] Change `twitter:card` from `"summary"` to `"summary_large_image"`
  - [ ] Add `twitter:image` pointing to `/og-default.png`
  - [ ] Ensure `og:type` is set to `"website"` (already present in 5.1)

- [ ] Task 3: Add `noindex, nofollow` to redirect/utility pages (AC: #3)
  - [ ] Add `export const metadata: Metadata = { robots: { index: false, follow: false } }` to `src/app/expired/page.tsx`
  - [ ] Verify no other redirect/utility pages need noindex (login, register pages are fine to index)

- [ ] Task 4: Write/update tests (AC: all)
  - [ ] Update `src/app/(public)/b/[slug]/page.test.tsx` to verify `og:image` and `twitter:card: "summary_large_image"` in metadata
  - [ ] Add test for expired page metadata (noindex, nofollow)
  - [ ] Test that public board metadata includes all required OG and Twitter fields

## Dev Notes

### Architecture & Patterns

- **Existing metadata**: Story 5.1 already added `generateMetadata()` to `src/app/(public)/b/[slug]/page.tsx` with `og:title`, `og:description`, `og:url`, `og:type: "website"`, and `twitter:card: "summary"`. This story ENHANCES it — do not rewrite from scratch.
- **`metadataBase`**: Already set in `src/app/layout.tsx:19` as `new URL(env.NEXT_PUBLIC_APP_URL)`. Relative URLs in OG tags (like `/og-default.png`) will automatically resolve to absolute URLs. Do NOT hardcode absolute URLs.
- **React.cache**: The public board page uses `const getPublicBoard = cache(findPublicBoardBySlug)` to deduplicate DB calls between `generateMetadata` and the page component. This pattern is already in place — just modify the metadata return object.

### What Already Exists (DO NOT Recreate)

| What | Where | Notes |
|------|-------|-------|
| `generateMetadata()` | `src/app/(public)/b/[slug]/page.tsx:17-48` | Already returns og:title, og:description, og:url, og:type, twitter:card="summary", twitter:title, twitter:description |
| `metadataBase` | `src/app/layout.tsx:19` | `new URL(env.NEXT_PUBLIC_APP_URL)` — makes relative OG image URLs absolute |
| `findPublicBoardBySlug` | `src/lib/db/boards.ts` | Board lookup with visibility filter and link includes |
| `React.cache` wrapper | `src/app/(public)/b/[slug]/page.tsx:9` | Deduplicates DB calls |
| Public board components | `src/components/public/` | Header and link list — no changes needed for this story |

### Exact Changes Required

**File: `src/app/(public)/b/[slug]/page.tsx`** — MODIFY `generateMetadata()` return object only:
```typescript
// Change the openGraph section to add image:
openGraph: {
  title: board.name,
  description,
  url,
  type: "website",
  images: [{ url: "/og-default.png", width: 1200, height: 630, alt: board.name }],
},
// Change twitter section:
twitter: {
  card: "summary_large_image",  // was "summary"
  title: board.name,
  description,
  images: ["/og-default.png"],
},
```

**File: `src/app/expired/page.tsx`** — ADD metadata export:
```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Link expired — Linkboard",
  robots: { index: false, follow: false },
};
```

**File: `public/og-default.png`** — CREATE a 1200x630 branded image. Options:
- Generate with a Node script using `sharp` or `@vercel/og` (ImageResponse)
- Or create a simple static PNG with the Linkboard name on a dark zinc/emerald gradient
- The image should be recognizable at thumbnail size and match the dark theme

### OG Image Approach

The architecture specifies `public/og-default.png` in the directory structure. For MVP, create a static default image. Do NOT build a dynamic OG image generation API route — that's over-engineering for this story. A single branded PNG shared by all public boards is sufficient.

**Image spec:**
- Dimensions: 1200x630px (standard OG image size)
- Content: "Linkboard" text, optionally with tagline "Short links, boards, and analytics"
- Style: Dark background (zinc-950), emerald accent, clean typography
- Format: PNG, optimized file size (target < 100KB)

If `sharp` is not installed and you don't want to add a dependency just for this, create a minimal SVG-based approach or use a simple canvas script. Alternatively, use Next.js `ImageResponse` from `next/og` to generate and save a static file.

### Redirect Pages & noindex

Short link redirects (`/{slug}`) are handled by middleware and return 301 redirects — they never render HTML, so no metadata is needed. The only rendered utility page that needs `noindex` is:

- `src/app/expired/page.tsx` — shown when an expired link is visited

The login (`/login`) and register (`/register`) pages are fine to be indexed — they're standard auth pages.

### Styling Conventions (MUST FOLLOW)

Established dark-theme patterns from previous stories:
- **Page backgrounds**: `zinc-950`
- **Accent**: `emerald-400` / `emerald-300`
- **Text**: `zinc-100` (primary), `zinc-400` (secondary), `zinc-500` (muted)

### Testing Strategy

- **Metadata tests**: Call `generateMetadata()` directly and assert on returned object fields
- **Test pattern**: See existing tests in `src/app/(public)/b/[slug]/page.test.tsx` for how metadata is tested
- **Test count baseline**: 367 tests passing, 9 skipped (from Story 5.1) — do not break existing tests
- **Expired page**: Add a simple test file or extend existing tests to verify robots metadata

### Previous Story Intelligence (Story 5.1)

**Learnings:**
- Test count baseline: **367 tests passing, 9 skipped**
- Code review fixes from 5.1: wrapped `findPublicBoardBySlug` in `React.cache()`, replaced `next/link` with `<a>`, added empty state
- Pre-existing build issue: `npm run build` fails at `src/lib/logger.ts:13` (Edge runtime) — ignore, not caused by this story
- Agent model: openai/gpt-5.4 for implementation, claude-opus-4-6 for review

**Patterns from 5.1 to follow:**
- Server components only for public pages
- Tests co-located as `*.test.tsx`
- Import aliases: `@/components/...`, `@/lib/...`, `@/config/...`

### Anti-Patterns to Avoid

- Do NOT create a dynamic OG image generation API route (e.g., `/api/og`) — use a static image for MVP
- Do NOT hardcode absolute URLs for OG image — `metadataBase` handles URL resolution
- Do NOT modify the public board components (`public-board-header.tsx`, `public-board-link-list.tsx`) — this story only changes metadata
- Do NOT add `noindex` to public board pages — they SHOULD be indexed for SEO
- Do NOT add client components — metadata is server-side only
- Do NOT remove existing OG tags from Story 5.1 — enhance them

### File Structure

| Action | File | Notes |
|--------|------|-------|
| MODIFY | `src/app/(public)/b/[slug]/page.tsx` | Add `og:image`, change `twitter:card` to `summary_large_image`, add `twitter:image` |
| MODIFY | `src/app/expired/page.tsx` | Add `metadata` export with `robots: { index: false, follow: false }` |
| CREATE | `public/og-default.png` | 1200x630 branded default OG image |
| MODIFY | `src/app/(public)/b/[slug]/page.test.tsx` | Update metadata tests for og:image, twitter card type |
| CREATE | `src/app/expired/page.test.tsx` | Test noindex robots metadata |

### Project Structure Notes

- OG image goes in `public/` as specified by architecture (`public/og-default.png`)
- No new directories needed
- All changes are within existing file locations established by Story 5.1

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5, Story 5.2]
- [Source: _bmad-output/planning-artifacts/epics.md#FR41 — OG/Twitter meta tags]
- [Source: _bmad-output/planning-artifacts/architecture.md#Directory Structure — public/og-default.png]
- [Source: _bmad-output/planning-artifacts/architecture.md#SSR for public boards — Open Graph, Twitter Cards]
- [Source: src/app/(public)/b/[slug]/page.tsx — existing generateMetadata with basic OG tags]
- [Source: src/app/layout.tsx:19 — metadataBase configuration]
- [Source: src/app/expired/page.tsx — needs noindex metadata]
- [Source: _bmad-output/implementation-artifacts/5-1-public-board-server-side-rendering.md — previous story context]
- [Source: _bmad-output/implementation-artifacts/5-1-dev-story-result.md — 367 tests, pre-existing build issue]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
