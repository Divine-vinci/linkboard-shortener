# Story 4.2: Dashboard Home with Overview and Quick Actions

Status: done

## Story

As a logged-in user,
I want a dashboard home page showing recent links, boards overview, and quick-create actions,
So that I can see my activity at a glance and take action quickly.

## Acceptance Criteria

1. **Given** I am logged in and on the dashboard home page (`/dashboard`)
   **When** the page loads
   **Then** I see my 5 most recent links with their title (or slug as fallback), target URL, and creation date
   **And** each link shows a click count placeholder ("—") since analytics (Epic 6) is not yet implemented

2. **Given** I am logged in and on the dashboard home page
   **When** the page loads
   **Then** I see my boards listed with their name, visibility badge, and link count

3. **Given** I am logged in and on the dashboard home page
   **When** the page loads
   **Then** I see quick-action buttons for "Create Link" and "Create Board"

4. **Given** I am a new user with no links or boards
   **When** the dashboard loads
   **Then** I see an empty state with guidance to create my first board with links
   **And** the empty state includes prominent CTAs for "Create Link" and "Create Board"

5. **Given** I click "Create Link" from the dashboard
   **When** the link creation form opens
   **Then** I can create a link with optional board assignment (FR32)
   **And** on success the recent links section updates to show the new link

6. **And** all interactive elements are keyboard-navigable with visible focus indicators (NFR22)
7. **And** the dashboard reaches First Contentful Paint in < 1.5s (NFR3)

## Tasks / Subtasks

- [x] Task 1: Create dashboard data fetching functions (AC: #1, #2)
  - [x] Add `findRecentLinksByUserId(userId, limit)` to `src/lib/db/links.ts` — fetches most recent N links ordered by `createdAt desc`
  - [x] Reuse existing `findBoardsByUserId(userId)` from `src/lib/db/boards.ts` (already returns `_count.boardLinks`)

- [x] Task 2: Create RecentLinks component (AC: #1, #6)
  - [x] Create `src/components/dashboard/recent-links.tsx` — server component
  - [x] Display link title (fallback to slug), truncated target URL, relative creation date, click count as "—"
  - [x] "View all" link to `/dashboard/links`
  - [x] Each link row clickable, navigating to target URL or link detail

- [x] Task 3: Create BoardsOverview component (AC: #2, #6)
  - [x] Create `src/components/dashboard/boards-overview.tsx` — server component
  - [x] Show board name, visibility badge (reuse pattern from `board-card.tsx`), link count
  - [x] "View all" link to `/dashboard/boards`
  - [x] Each board clickable, navigating to `/dashboard/boards/[id]`

- [x] Task 4: Create QuickActions component (AC: #3, #5, #6)
  - [x] Create `src/components/dashboard/quick-actions.tsx` — client component
  - [x] "Create Link" button opens inline `CreateLinkForm` (from `src/components/links/create-link-form.tsx`) in a dialog/modal or expandable section
  - [x] "Create Board" button navigates to `/dashboard/boards/new` (reuse existing BoardForm page)
  - [x] Pass boards list to CreateLinkForm for board assignment dropdown

- [x] Task 5: Create EmptyState component (AC: #4)
  - [x] Create `src/components/dashboard/empty-state.tsx`
  - [x] Show welcome message and guidance: "Create your first board and start adding links"
  - [x] Include "Create Link" and "Create Board" CTA buttons
  - [x] Render when both links and boards arrays are empty

- [x] Task 6: Build dashboard home page (AC: #1, #2, #3, #4, #7)
  - [x] Replace `src/app/(dashboard)/page.tsx` placeholder with server component that fetches data
  - [x] Update `src/app/(dashboard)/dashboard/page.tsx` to render the real dashboard (not re-export placeholder)
  - [x] Layout: QuickActions at top, then two-column grid (RecentLinks + BoardsOverview) on desktop, stacked on mobile
  - [x] Fetch session via `auth()`, then parallel fetch recent links + boards
  - [x] Conditional render: EmptyState if no links AND no boards, otherwise full dashboard

- [x] Task 7: Write tests (AC: all)
  - [x] Test `findRecentLinksByUserId` db function
  - [x] Test RecentLinks component rendering with links and empty state
  - [x] Test BoardsOverview component rendering
  - [x] Test EmptyState component rendering
  - [x] Test QuickActions component interactions
  - [x] Test dashboard page integration (data flow, conditional rendering)

## Dev Notes

### Architecture & Patterns

- **Dashboard page route**: The `/dashboard` route currently has TWO files:
  - `src/app/(dashboard)/page.tsx` — original Story 1.4 placeholder (this is the REAL route handler for `/dashboard` since the `(dashboard)` route group is transparent)
  - `src/app/(dashboard)/dashboard/page.tsx` — re-exports the above (this handles `/dashboard/dashboard` which is NOT the intended URL)
  - **FIX**: Replace `src/app/(dashboard)/page.tsx` with the real dashboard. The `src/app/(dashboard)/dashboard/page.tsx` file was created in Story 4.1 as a shim — it should also be updated to avoid the `/dashboard/dashboard` double-nesting issue. Check which file the sidebar nav links to (`/dashboard` via navigation.tsx) and make sure that route renders the new dashboard.
- **Data fetching**: Server component pattern — `auth()` for session, then direct db calls via `lib/db/*` functions. NO `fetch()` to API routes from server components.
- **Component pattern**: Server components for data display, client components only where interactivity is needed (forms, modals).

### Styling Conventions (MUST FOLLOW)

These are the established dark-theme patterns from Story 4.1 and prior stories:

- **Page backgrounds**: `zinc-950` (page body set in layout)
- **Panel/card container**: `rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6`
- **Section headings**: `text-lg font-semibold text-zinc-100`
- **Secondary text**: `text-sm text-zinc-400`
- **Tertiary/muted text**: `text-xs text-zinc-500`
- **Accent/active**: `emerald-400` for buttons, links, highlights
- **Buttons (primary)**: `rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400 transition`
- **Buttons (secondary)**: `rounded-2xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-emerald-400 hover:text-emerald-300 transition`
- **Focus pattern**: `focus:outline-none focus:ring-2 focus:ring-emerald-400/40`
- **Hover on cards**: `hover:border-emerald-400/50 transition`
- **Badges** (visibility): See `board-card.tsx` for the visibility badge pattern — `rounded-full px-2 py-0.5 text-xs` with color variants

### Click Counts — Important Constraint

Epic 6 (Link Analytics) is NOT implemented yet. The Link model has no `clickCount` field. The AC says "with click counts" — display this as "—" (em dash) for now. Do NOT add a click count column to the schema or create analytics infrastructure. When Epic 6 ships, the dashboard will be updated to show real counts.

### Existing Components to Reuse

| Component | Path | What to Reuse |
|-----------|------|---------------|
| `CreateLinkForm` | `src/components/links/create-link-form.tsx` | Embed in dialog for quick link creation. Accepts `boards?: BoardOption[]` prop |
| `BoardCard` | `src/components/boards/board-card.tsx` | Reference visibility badge styling pattern |
| `LogoutButton` | `src/components/auth/logout-button.tsx` | Already in sidebar, no action needed |

### Database Functions

**Existing (reuse as-is):**
- `findBoardsByUserId(userId, options?)` from `src/lib/db/boards.ts` — returns boards with `_count.boardLinks` (link count). Ordered by name asc.
- `findLinksForLibrary({userId, limit: 5})` from `src/lib/db/links.ts` — could work but returns `{links, total}` object and applies search/tag filtering overhead.

**New function needed:**
- `findRecentLinksByUserId(userId: string, limit = 5)` in `src/lib/db/links.ts` — simple: `prisma.link.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: limit })`. Keep it simple, no search/filter overhead.

### Responsive Layout

- **Desktop (lg+)**: Two-column grid — RecentLinks (wider, ~60%) | BoardsOverview (~40%). QuickActions row above.
- **Tablet (md)**: Same two-column but narrower proportions.
- **Mobile (< md)**: Single column, stacked: QuickActions → RecentLinks → BoardsOverview.
- Add `pb-20 md:pb-0` to page content on mobile for bottom nav clearance (already handled by dashboard layout).

### Navigation Context

The sidebar nav from Story 4.1 links to `/dashboard` for the Dashboard item (see `src/components/layout/navigation.tsx`). The active state uses `pathname === item.href` for exact match on `/dashboard`. Ensure the page renders at this exact route.

### File Structure

| Action | File | Notes |
|--------|------|-------|
| CREATE | `src/components/dashboard/recent-links.tsx` | Recent links display |
| CREATE | `src/components/dashboard/boards-overview.tsx` | Boards overview display |
| CREATE | `src/components/dashboard/quick-actions.tsx` | Quick action buttons (client component) |
| CREATE | `src/components/dashboard/empty-state.tsx` | Empty state for new users |
| CREATE | `src/components/dashboard/recent-links.test.tsx` | Tests |
| CREATE | `src/components/dashboard/boards-overview.test.tsx` | Tests |
| CREATE | `src/components/dashboard/quick-actions.test.tsx` | Tests |
| CREATE | `src/components/dashboard/empty-state.test.tsx` | Tests |
| MODIFY | `src/lib/db/links.ts` | Add `findRecentLinksByUserId` |
| MODIFY | `src/lib/db/links.test.ts` | Test new function |
| MODIFY | `src/app/(dashboard)/page.tsx` | Replace placeholder with real dashboard |
| MODIFY | `src/app/(dashboard)/dashboard/page.tsx` | Update to properly handle route (re-export or redirect) |

### Previous Story Intelligence (Story 4.1)

**Learnings from Story 4.1:**
- Dev agent created a separate `4-1-dev-story-result.md` instead of updating the story file — dev should update the story file directly (check tasks, set status, fill Dev Agent Record)
- `lucide-react` was listed as "already installed" but wasn't — it was added. It IS now installed as a direct dep.
- Code review found tablet sidebar was missing LogoutButton — check all responsive variants render completely
- Test count baseline: **339 tests passing, 8 skipped** — do not break existing tests
- Build has a pre-existing Edge Runtime warning in `src/lib/logger.ts:13` (`process.stdout.write`) — this is NOT caused by story work

**Established patterns from 4.1:**
- Nav components in `src/components/layout/`
- Client components use `"use client"` directive
- Tests co-located as `*.test.tsx`
- Import aliases: `@/components/...`, `@/lib/...`

### Anti-Patterns to Avoid

- Do NOT fetch data via `fetch('/api/v1/...')` in server components — call `lib/db/*` functions directly
- Do NOT add a click count field to the Prisma schema — analytics is Epic 6
- Do NOT create a new layout file — use the existing `(dashboard)/layout.tsx`
- Do NOT use global state/context for dashboard data — server components pass props
- Do NOT duplicate the CreateLinkForm — import and reuse the existing one
- Do NOT create separate mobile/desktop page files — use Tailwind responsive classes in one page

### Project Structure Notes

- New dashboard components go in `src/components/dashboard/` (create directory)
- Follow existing naming: `kebab-case.tsx` for files, `PascalCase` for components
- Tests co-located: `component-name.test.tsx` next to `component-name.tsx`
- Alignment with architecture: `app/(dashboard)/*` are server components, `components/*` are feature components

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4, Story 4.2]
- [Source: _bmad-output/planning-artifacts/prd.md#FR31, FR32, FR33]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture, Dashboard (FR31-FR33)]
- [Source: src/app/(dashboard)/page.tsx — current placeholder to replace]
- [Source: src/components/links/create-link-form.tsx — reuse for quick link creation]
- [Source: src/components/boards/board-card.tsx — reference for board display patterns]
- [Source: src/lib/db/links.ts — existing findLinksByUserId, add findRecentLinksByUserId]
- [Source: src/lib/db/boards.ts — existing findBoardsByUserId with _count.boardLinks]
- [Source: _bmad-output/implementation-artifacts/4-1-dashboard-layout-and-sidebar-navigation.md — previous story context]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `npm test`
- `npm run lint`

### Completion Notes List

- Implemented `/dashboard` as the authenticated dashboard home with parallel data loading, empty-state branching, and responsive overview layout.
- Added `findRecentLinksByUserId` plus dashboard-specific RecentLinks, BoardsOverview, QuickActions, and EmptyState components.
- Added component and page coverage for dashboard rendering and interactions; full suite passed locally (350 passed, 9 skipped).

### Code Review Fixes (claude-opus-4-6)

- **H1 Fixed**: Replaced `/dashboard/dashboard` re-export with a redirect to `/dashboard` to eliminate duplicate URL.
- **M1 Fixed**: Synced sprint-status.yaml to match story status.
- **M2 Fixed**: Removed redundant `pb-20 md:pb-0` from page — layout already handles bottom padding.
- **M3 Fixed**: Changed RecentLinks external URLs from `next/link` to `<a target="_blank" rel="noopener noreferrer">`.
- **M4 Fixed**: Exported `formatRelativeDate` and added 7 new tests covering all 5 branches plus date rendering and `target="_blank"` verification.
- Test suite after fixes: 357 passed, 9 skipped.

### File List

- `src/app/(dashboard)/page.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/page.test.tsx`
- `src/components/dashboard/recent-links.tsx`
- `src/components/dashboard/recent-links.test.tsx`
- `src/components/dashboard/boards-overview.tsx`
- `src/components/dashboard/boards-overview.test.tsx`
- `src/components/dashboard/quick-actions.tsx`
- `src/components/dashboard/quick-actions.test.tsx`
- `src/components/dashboard/empty-state.tsx`
- `src/components/dashboard/empty-state.test.tsx`
- `src/lib/db/links.ts`
- `src/lib/db/links.test.ts`
