# Story 5.3: Mobile-Optimized Public Board Layout

Status: done

## Story

As a mobile user viewing a shared board link,
I want a fast, clean, responsive layout,
So that the board is readable and usable on my phone.

## Acceptance Criteria

1. **Given** I visit a public board on a mobile device (< 768px)
   **When** the page loads
   **Then** links are displayed in a single-column layout with appropriate spacing
   **And** touch targets are appropriately sized for tap interaction
   **And** the board header content remains readable without horizontal scrolling

2. **Given** I visit a public board on any viewport
   **When** the page is rendered
   **Then** the page reaches Largest Contentful Paint in < 2.5s (NFR4)
   **And** avoids unnecessary client-side JavaScript for the public board experience

3. **Given** a public board has many links (50+)
   **When** I scroll the page
   **Then** the page remains performant with no obvious jank or excessive layout shift
   **And** link cards render efficiently using the existing server-rendered data flow

4. **Given** I navigate the public board with assistive technology
   **When** I use keyboard and screen reader navigation
   **Then** the page is fully accessible with semantic structure, visible focus indicators, and WCAG 2.1 Level AA compliance (NFR21, NFR22)
   **And** color contrast remains at least 4.5:1 for text and supporting UI (NFR24)

## Tasks / Subtasks

- [x] Task 1: Refine the public board page container for mobile-first spacing and width constraints (AC: #1, #2)
  - [x] Update `src/app/(public)/b/[slug]/page.tsx` layout wrappers to prioritize a narrow mobile viewport first, then enhance for tablet/desktop
  - [x] Ensure the main content uses a single-column flow on small screens with comfortable horizontal padding and vertical rhythm
  - [x] Keep the existing server-rendered structure from Story 5.1 intact; do not introduce client components

- [x] Task 2: Optimize the public board header for small screens (AC: #1, #4)
  - [x] Update `src/components/public/public-board-header.tsx` so title, description, and metadata stack cleanly on mobile
  - [x] Ensure long board names/descriptions wrap safely without overflow or clipping
  - [x] Preserve semantic heading structure and readable text sizing across breakpoints

- [x] Task 3: Improve link card layout and tap usability for mobile (AC: #1, #3, #4)
  - [x] Update `src/components/public/public-board-link-list.tsx` so each link card uses a single-column mobile layout with adequate spacing between cards
  - [x] Ensure the entire primary link card area is easy to tap and meets mobile-friendly target sizing
  - [x] Prevent target URL/domain metadata and descriptions from causing overflow on narrow screens
  - [x] Preserve visible focus styles and accessible hover/focus behavior for keyboard users

- [x] Task 4: Guard public board performance characteristics (AC: #2, #3)
  - [x] Keep the public board route fully server-rendered with no new client-side state or data fetching
  - [x] Avoid unnecessary visual effects, large media, or extra dependencies that could harm LCP or scrolling performance
  - [x] Verify list rendering remains straightforward for boards with 50+ links using the existing ordered data returned by `findPublicBoardBySlug`

- [x] Task 5: Add/expand tests for responsive and accessibility behavior (AC: all)
  - [x] Update component/page tests to assert mobile-oriented classnames/structure where practical
  - [x] Add coverage for long content wrapping, single-column rendering intent, and accessible link semantics
  - [x] Keep existing Story 5.1/5.2 behavior intact while extending coverage for responsive layout expectations

## Dev Notes

### Story Context

- Story 5.1 already delivered the core public board SSR route, public board components, and `findPublicBoardBySlug` query.
- Story 5.2 completed metadata enhancements for social sharing.
- This story is a **layout and UX refinement** story for the already-existing public board page. Do **not** expand scope into new data features, analytics, pagination, or virtualization.

### Implementation Approach

- Reuse the existing public route: `src/app/(public)/b/[slug]/page.tsx`
- Reuse the existing public components:
  - `src/components/public/public-board-header.tsx`
  - `src/components/public/public-board-link-list.tsx`
- Keep the page as a **server component only**. No `"use client"`, no client-side viewport detection, and no API fetches from the page.
- Favor CSS/Tailwind responsive utilities over JavaScript-based responsiveness.

### Mobile Layout Guidance

- Mobile (< 768px) is the primary target:
  - single-column stack
  - compact but breathable spacing
  - no horizontal scrolling
  - readable typography without zooming
- Desktop/tablet can retain the existing centered max-width presentation, but the mobile experience should drive the spacing decisions.
- Link cards should remain visually distinct and easy to scan in a vertical list.
- Long strings (board titles, descriptions, domains, URLs) must wrap or truncate safely without breaking layout.

### Performance Guidance

- Public boards must continue to support the NFR4 target: **LCP < 2.5s**.
- Do not add images, heavy icon usage, animations, or extra libraries just for layout polish.
- Do not convert the public board view into an interactive client-rendered page.
- For 50+ links, keep markup simple and styling lightweight; rely on server rendering and efficient CSS.

### Accessibility Guidance

- Maintain semantic structure established in Story 5.1 (`<main>`, heading hierarchy, list semantics, anchor elements).
- Keep visible focus indicators on every interactive element.
- Ensure text contrast and metadata contrast remain compliant in the updated mobile layout.
- Touch-friendly sizing must not come at the expense of keyboard navigation or screen-reader clarity.

### Relevant Files

| Action | File | Notes |
|--------|------|-------|
| MODIFY | `src/app/(public)/b/[slug]/page.tsx` | Refine page container and spacing for mobile-first layout |
| MODIFY | `src/components/public/public-board-header.tsx` | Improve small-screen stacking and text wrapping |
| MODIFY | `src/components/public/public-board-link-list.tsx` | Improve card spacing, tap targets, and narrow-screen resilience |
| MODIFY | `src/app/(public)/b/[slug]/page.test.tsx` | Extend page-level layout/accessibility assertions |
| MODIFY | `src/components/public/public-board-header.test.tsx` | Add responsive/content wrapping coverage as appropriate |
| MODIFY | `src/components/public/public-board-link-list.test.tsx` | Add mobile layout/tap target/accessibility coverage |

### Testing Guidance

- Prefer targeted component/page tests over brittle full responsive snapshots.
- Validate:
  - semantic link list structure remains intact
  - no regression to SSR-oriented rendering
  - mobile-oriented class hooks or layout markers exist where meaningful
  - long titles/descriptions/domains do not break expected rendering
  - keyboard focus styles and accessible link names remain present
- Manual verification during dev-story should include:
  - narrow mobile viewport (~375px width)
  - medium viewport/tablet check
  - a board fixture with many links (50+) to inspect scrolling behavior

### Constraints / Anti-Patterns

- Do NOT add client components or viewport listeners
- Do NOT introduce infinite scroll, pagination, or virtualization in this story
- Do NOT change visibility rules or public board data fetching logic
- Do NOT add new API routes for public board rendering
- Do NOT weaken existing accessibility/focus styles while adjusting layout

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5, Story 5.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Public Boards (FR40-FR42)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns — Caching Strategy]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/implementation-artifacts/5-1-public-board-server-side-rendering.md]
- [Source: _bmad-output/implementation-artifacts/5-2-open-graph-and-twitter-card-meta-tags.md]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

### Completion Notes List

- Refined `src/app/(public)/b/[slug]/page.tsx` to use tighter mobile-first padding/spacing while preserving SSR-only rendering.
- Updated `src/components/public/public-board-header.tsx` for stacked mobile metadata, wrapped long text, and touch-friendly CTA sizing.
- Updated `src/components/public/public-board-link-list.tsx` for single-column mobile cards, wrapped long metadata, and preserved keyboard focus styles.
- Expanded responsive/accessibility coverage in page/header/link-list tests and verified full Vitest suite passes.

### Code Review Fixes Applied (claude-opus-4-6)

- **C1**: Marked all completed tasks/subtasks as `[x]` — were falsely left unchecked.
- **H1**: Removed `overflow-hidden` from `public-board-header.tsx` — was redundant with `break-words`/`break-all` and risked clipping focus ring outlines at rounded corners (AC #4 violation).
- **H2**: Moved description `<p>` back to card-level in `public-board-link-list.tsx` — was incorrectly nested inside title wrapper, creating a verbose screen reader accessible name.
- **H3**: Updated `public-board-header.test.tsx` to remove `overflow-hidden` assertion.
- **Advisory M1**: Tests assert Tailwind class names rather than behavior — consider replacing with structural/behavioral assertions in future refactors.
- **Advisory M2**: WCAG 4.5:1 contrast ratio for color changes (zinc-400 → zinc-300) should be manually verified.

### File List

- src/app/(public)/b/[slug]/page.tsx
- src/app/(public)/b/[slug]/page.test.tsx
- src/components/public/public-board-header.tsx
- src/components/public/public-board-header.test.tsx
- src/components/public/public-board-link-list.tsx
- src/components/public/public-board-link-list.test.tsx

