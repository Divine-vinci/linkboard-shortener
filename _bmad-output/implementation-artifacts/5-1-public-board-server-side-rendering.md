# Story 5.1: Public Board Server-Side Rendering

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As anyone with a public or unlisted board URL,
I want to view the board and its links without logging in,
So that shared boards are accessible to all audiences.

## Acceptance Criteria

1. **Given** a board has visibility set to "public" or "unlisted"
   **When** I visit `/b/{board-slug}` without authentication
   **Then** the page is fully server-side rendered (SSR) — the HTML response contains all board content for SEO crawlability (FR40)
   **And** I see the board name, description, and all links with titles, descriptions, and target URLs
   **And** each link is clickable and redirects via the short URL
   **And** the page does NOT require JavaScript to display content

2. **Given** a board has visibility set to "private"
   **When** I visit `/b/{board-slug}` without authentication
   **Then** I see a 404 page (don't reveal existence)

3. **Given** the board slug doesn't exist
   **When** I visit `/b/{nonexistent-slug}`
   **Then** I see a 404 page

4. **And** all interactive elements are keyboard-navigable with visible focus indicators (NFR22)
5. **And** the page meets WCAG 2.1 Level AA compliance (NFR21)
6. **And** the page reaches Largest Contentful Paint in < 2.5s (NFR4)

## Tasks / Subtasks

- [x] Task 1: Create public board route group and page (AC: #1, #2, #3)
  - [x] Create `src/app/(public)/b/[slug]/page.tsx` as a server component
  - [x] Use `findPublicBoardBySlug(slug)` to look up the board (via `React.cache()` wrapper)
  - [x] Return `notFound()` if board doesn't exist OR visibility is `Private`
  - [x] For `Public`/`Unlisted` boards, fetch links via single-query `findPublicBoardBySlug`
  - [x] Render board name, description, and ordered link list as pure server-rendered HTML

- [x] Task 2: Implement `generateMetadata()` for the public board page (AC: #1)
  - [x] Export `generateMetadata({ params })` returning dynamic `title` (board name) and `description` (board description)
  - [x] Include basic Open Graph tags: `og:title`, `og:description`, `og:url` (canonical `/b/{slug}`)
  - [x] Include `twitter:card: "summary"` (Story 5.2 will enhance to `summary_large_image` with OG image)
  - [x] For 404 cases, return default metadata (Next.js handles notFound before metadata is used)

- [x] Task 3: Create public board link list display component (AC: #1, #4, #5)
  - [x] Create `src/components/public/public-board-link-list.tsx` — server component
  - [x] Display each link: title (fallback to slug), description (if present), target URL domain
  - [x] Each link is an `<a>` element linking to `/{link.slug}` (the short URL redirect path)
  - [x] Use `target="_blank" rel="noopener noreferrer"` for external link behavior
  - [x] Ensure keyboard navigation and focus indicators (`focus:outline-none focus:ring-2 focus:ring-emerald-400/40`)
  - [x] Ensure color contrast minimum 4.5:1 (NFR24)

- [x] Task 4: Create public board layout/header component (AC: #1, #5)
  - [x] Create `src/components/public/public-board-header.tsx` — server component
  - [x] Show board name as `<h1>`, description as paragraph, link count
  - [x] Minimal branding: "Powered by Linkboard" footer or subtle link
  - [x] Responsive: single-column on mobile, max-width container on desktop

- [x] Task 5: Style the public board page (AC: #1, #4, #5, #6)
  - [x] Use the established dark-theme patterns (zinc backgrounds, emerald accents)
  - [x] Responsive layout: single-column card list, centered max-width container
  - [x] Mobile-first: touch targets appropriately sized, readable text sizes
  - [x] Minimal JS footprint — this is a server component page, no client components needed

- [x] Task 6: Create `findPublicBoardBySlug` db function (AC: #1, #2)
  - [x] Add `findPublicBoardBySlug(slug)` to `src/lib/db/boards.ts`
  - [x] Queries board by slug WHERE visibility IN ('Public', 'Unlisted')
  - [x] Includes boardLinks with link data, ordered by position ascending
  - [x] Returns null if not found or private (single query, no information leakage)

- [x] Task 7: Write tests (AC: all)
  - [x] Test `findPublicBoardBySlug` db function (public found, unlisted found, private returns null, not found returns null)
  - [x] Test public board page rendering with links
  - [x] Test 404 for private board
  - [x] Test 404 for nonexistent slug
  - [x] Test metadata generation (title, description, OG tags)
  - [x] Test accessibility: keyboard navigation, focus indicators, semantic HTML

## Dev Notes

### Architecture & Patterns

- **Route group**: Create `src/app/(public)/b/[slug]/page.tsx`. The `(public)` route group is specified in the architecture but doesn't exist yet — create it. The route group is transparent in the URL, so the actual path is `/b/{slug}`.
- **No layout needed for (public) group**: The root `src/app/layout.tsx` applies (fonts, global styles). Do NOT create a `(public)/layout.tsx` unless you need shared UI across multiple public pages. For now, the page itself handles all rendering.
- **Server component ONLY**: The entire public board page must be a server component. No `"use client"` directive. No client components. This ensures the page renders fully on the server and works without JavaScript.
- **Data fetching**: Direct Prisma calls via `lib/db/*` functions. NO `fetch()` to API routes. NO client-side data fetching.

### Existing Functions to Reuse

| Function | Path | What It Does |
|----------|------|-------------|
| `findBoardBySlug(slug)` | `src/lib/db/boards.ts` | Finds board by slug — but does NOT filter by visibility and does NOT include links. Use as reference, create a new function. |
| `getBoardLinksWithMetadata(boardId)` | `src/lib/db/board-links.ts` | Gets all links for a board with full Link metadata, ordered by position. Can reuse directly after board lookup. |
| `findBoardById(id)` | `src/lib/db/boards.ts` | Reference for include pattern with boardLinks → link. |

### New Database Function

Create `findPublicBoardBySlug(slug: string)` in `src/lib/db/boards.ts`:
```typescript
// Single query: find board by slug, only if Public or Unlisted, include links ordered by position
export async function findPublicBoardBySlug(slug: string, db = prisma) {
  return db.board.findFirst({
    where: {
      slug,
      visibility: { in: [BoardVisibility.Public, BoardVisibility.Unlisted] },
    },
    include: {
      boardLinks: {
        include: { link: true },
        orderBy: { position: "asc" },
      },
    },
  });
}
```
This combines the board lookup + visibility check + link fetching in one query, avoiding a separate `getBoardLinksWithMetadata` call. Returns `null` for private boards and nonexistent slugs — no information leakage.

### Styling Conventions (MUST FOLLOW)

Established dark-theme patterns from previous stories:

- **Page backgrounds**: `zinc-950` (already set on body in root layout)
- **Panel/card container**: `rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6`
- **Section headings (h1)**: `text-2xl font-bold text-zinc-100` or `text-3xl` for page title
- **Secondary text**: `text-sm text-zinc-400`
- **Tertiary/muted text**: `text-xs text-zinc-500`
- **Accent/links**: `text-emerald-400 hover:text-emerald-300`
- **Focus pattern**: `focus:outline-none focus:ring-2 focus:ring-emerald-400/40`
- **Card hover**: `hover:border-emerald-400/50 transition`

### Link Display Pattern

For each link in the board:
- Show title (fallback to slug if no title)
- Show description if present (truncate if long)
- Show target URL domain (e.g., "github.com") as muted text
- Link `href` should be `/{link.slug}` — the short URL path that goes through the redirect engine
- Use `<a>` tags (NOT `next/link`) since these are external redirects

### SEO & Metadata

- Use Next.js `generateMetadata()` — no external library needed
- Set `title`, `description`, `openGraph`, `twitter` properties
- `metadataBase` is already set in root layout — relative URLs work for OG
- Canonical URL: `/b/{slug}`
- Do NOT add `robots: noindex` — public boards SHOULD be indexed (unlike redirect pages)

### Performance Considerations

- **Single database query**: The new `findPublicBoardBySlug` function does one query with includes, not multiple round trips
- **No client JS**: Pure server component means zero JavaScript bundle for this page
- **No Redis caching needed for MVP**: Board pages are not in the redirect hot path. If needed later, add cache headers or ISR.
- **LCP target < 2.5s (NFR4)**: Should be trivially met since it's a server-rendered page with no client JS and no external resources

### Accessibility Requirements (MUST FOLLOW)

- Semantic HTML: `<h1>` for board name, `<ul>`/`<li>` for link list, `<a>` for links
- All links must have visible focus indicators
- Color contrast minimum 4.5:1 for all text (zinc-400 on zinc-950 = ~5.5:1, passes)
- Screen reader: board name and description readable, link list navigable
- No images in MVP — no alt text concerns yet

### Previous Story Intelligence (Story 4.2)

**Learnings from Story 4.2:**
- Test count baseline: **357 tests passing, 9 skipped** — do not break existing tests
- `lucide-react` is installed as a direct dependency
- Dev agent used `openai/gpt-5.4` — model performed well
- Code review caught: `/dashboard/dashboard` double-nesting needed redirect fix, external links needed `target="_blank"`, utility functions should be exported and tested
- Build has a pre-existing Edge Runtime warning in `src/lib/logger.ts:13` — ignore, not caused by story work

**Patterns established across Epic 3-4:**
- Server components for data display pages (no `"use client"`)
- Client components only for interactive elements (forms, modals, drag-reorder)
- Tests co-located as `*.test.tsx` / `*.test.ts`
- Import aliases: `@/components/...`, `@/lib/...`, `@/config/...`
- Board slug → `/b/{slug}` path pattern already used in `board-card.tsx` share URL display

### Anti-Patterns to Avoid

- Do NOT fetch data via `fetch('/api/v1/...')` in server components — call `lib/db/*` functions directly
- Do NOT use `next/link` for short URL links — these are external redirects, use plain `<a>` tags
- Do NOT create a dashboard-style layout with sidebar for public pages — public pages are standalone
- Do NOT require authentication — this is a PUBLIC page
- Do NOT reveal whether a private board exists — return 404 for both private and nonexistent
- Do NOT add client components or `"use client"` — the entire page must be server-rendered
- Do NOT create API endpoints for public board data — server component fetches directly from DB
- Do NOT import dashboard components — create separate public-specific components in `src/components/public/`

### File Structure

| Action | File | Notes |
|--------|------|-------|
| CREATE | `src/app/(public)/b/[slug]/page.tsx` | Public board SSR page with `generateMetadata()` |
| CREATE | `src/components/public/public-board-header.tsx` | Board name, description, link count |
| CREATE | `src/components/public/public-board-link-list.tsx` | Ordered link list display |
| CREATE | `src/app/(public)/b/[slug]/page.test.tsx` | Page tests (rendering, 404s, metadata) |
| CREATE | `src/components/public/public-board-header.test.tsx` | Header component tests |
| CREATE | `src/components/public/public-board-link-list.test.tsx` | Link list component tests |
| MODIFY | `src/lib/db/boards.ts` | Add `findPublicBoardBySlug` function |
| MODIFY | `src/lib/db/boards.test.ts` | Test new function |

### Project Structure Notes

- New public components go in `src/components/public/` (create directory)
- New route goes in `src/app/(public)/b/[slug]/` (create directories)
- Follow existing naming: `kebab-case.tsx` for files, `PascalCase` for components
- Tests co-located: `component-name.test.tsx` next to `component-name.tsx`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5, Story 5.1]
- [Source: _bmad-output/planning-artifacts/prd.md#FR40, FR15, NFR4, NFR21-24]
- [Source: _bmad-output/planning-artifacts/architecture.md#Routing Strategy — (public)/ route group]
- [Source: _bmad-output/planning-artifacts/architecture.md#Directory Structure — app/(public)/b/[slug]/page.tsx]
- [Source: _bmad-output/planning-artifacts/architecture.md#Public Boards (FR40-FR42) requirement mapping]
- [Source: src/lib/db/boards.ts — existing findBoardBySlug, findBoardById]
- [Source: src/lib/db/board-links.ts — existing getBoardLinksWithMetadata]
- [Source: src/components/boards/board-card.tsx — share path logic: `/b/${board.slug}`]
- [Source: src/app/(dashboard)/dashboard/boards/[id]/page.tsx — board detail page pattern]
- [Source: prisma/schema.prisma — Board, Link, BoardLink models, BoardVisibility enum]
- [Source: _bmad-output/implementation-artifacts/4-2-dashboard-home-with-overview-and-quick-actions.md — previous story context]

## Dev Agent Record

### Agent Model Used

- openai/gpt-5.4 (initial implementation)
- claude-opus-4-6 (code review + fixes)

### Debug Log References

- `npm test` — 369 passed, 9 skipped
- `npm run lint` — clean

### Completion Notes List

- AC1/AC2/AC3: SSR public board route at `src/app/(public)/b/[slug]/page.tsx` using `findPublicBoardBySlug(slug)` with `React.cache()` deduplication and `notFound()` for private/missing boards.
- AC1: `generateMetadata()` with canonical, Open Graph, and Twitter summary metadata for `/b/{slug}`.
- AC1/AC4/AC5: `src/components/public/public-board-header.tsx` and `src/components/public/public-board-link-list.tsx` with semantic HTML, keyboard focus styles, empty state, and dark-theme public layout.
- AC1/AC6: Single-query public board lookup in `src/lib/db/boards.ts` with visibility filter and ordered link include.
- AC-all: Tests in `page.test.tsx`, `public-board-header.test.tsx`, `public-board-link-list.test.tsx`, and `boards.test.ts`.
- Code review fixes: wrapped `findPublicBoardBySlug` in `React.cache()` to deduplicate DB calls between `generateMetadata` and page component; replaced `next/link` with `<a>` to eliminate client JS; added empty link list state; added tests for empty list and position badges.

### File List

- `src/app/(public)/b/[slug]/page.tsx` — CREATED
- `src/app/(public)/b/[slug]/page.test.tsx` — CREATED
- `src/components/public/public-board-header.tsx` — CREATED
- `src/components/public/public-board-header.test.tsx` — CREATED
- `src/components/public/public-board-link-list.tsx` — CREATED
- `src/components/public/public-board-link-list.test.tsx` — CREATED
- `src/lib/db/boards.ts` — MODIFIED (added `findPublicBoardBySlug`)
- `src/lib/db/boards.test.ts` — MODIFIED (added tests for `findPublicBoardBySlug`)
