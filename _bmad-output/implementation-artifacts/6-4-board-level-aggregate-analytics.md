# Story 6.4: Board-Level Aggregate Analytics

Status: done

## Story

As a logged-in user,
I want to view aggregate analytics for all links in a board,
so that I can assess the performance of my curated collection as a whole.

## Acceptance Criteria

1. **Given** I navigate to a board's analytics page (`/dashboard/boards/[id]/analytics`)
   **When** the page loads
   **Then** I see aggregate metrics: total clicks across all board links, top-performing links, referrer breakdown, and geographic distribution (FR20)
   **And** each link in the board shows its individual click count for comparison

2. **Given** a board has no links or no clicks
   **When** I view the board analytics
   **Then** I see an appropriate empty state

3. **Given** I only own this board
   **When** analytics data is queried
   **Then** only click events for links in my board are returned (NFR13)

4. **And** all charts provide text alternatives for screen readers (NFR23)
   **And** color is not the sole means of conveying information in charts (NFR24)

## Tasks / Subtasks

- [x] Task 1: Add board-level analytics DB queries (AC: #1, #3)
  - [x] Add `getBoardAnalyticsOverview(userId, boardId)` to `src/lib/db/analytics.ts`
    - Returns: `{ boardName, totalClicks, linkCount, topLinks: { id, slug, title, clicks }[] }` or null
    - Query: aggregate `click_events` through `board_links` join, scoped by `boards.user_id`
    - Include per-link click counts for the comparison table (AC #1)
  - [x] Add `getBoardClicksTimeseries(userId, boardId, granularity)` to `src/lib/db/analytics.ts`
    - Reuse `LinkClicksTimeseriesPoint[]` return type and `formatBucketLabel()` helper
    - Query: same `date_trunc` pattern as link timeseries but joined through `board_links`
  - [x] Add `getBoardReferrerBreakdown(userId, boardId)` to `src/lib/db/analytics.ts`
    - Reuse `ReferrerBreakdownItem[]` return type
    - Same domain extraction + grouping as link referrer query, aggregated across all board links
  - [x] Add `getBoardGeoBreakdown(userId, boardId)` to `src/lib/db/analytics.ts`
    - Reuse `GeoBreakdownItem[]` return type
    - Same country grouping + ordering pattern as link geo query
  - [x] Add tests in `src/lib/db/analytics.test.ts` for all 4 new functions

- [x] Task 2: Create board analytics header component (AC: #1, #2)
  - [x] Create `src/components/analytics/board-analytics-header.tsx`
  - [x] Display board name, total clicks across all links, number of links
  - [x] Match existing `link-analytics-header.tsx` design patterns
  - [x] Handle zero-state: "No links in this board" or "No clicks yet"
  - [x] Add component test `src/components/analytics/board-analytics-header.test.tsx`

- [x] Task 3: Create per-link click count table (AC: #1, #2)
  - [x] Create `src/components/analytics/board-links-table.tsx`
  - [x] Table showing each link in board with: slug, title, click count, percentage of total
  - [x] Sorted by clicks descending (top-performing links first)
  - [x] Use existing design system table patterns (zinc-800 borders, zinc-100 text)
  - [x] Handle zero-state: "No links in this board yet"
  - [x] Add component test `src/components/analytics/board-links-table.test.tsx`

- [x] Task 4: Create board analytics page (AC: all)
  - [x] Create `src/app/(dashboard)/dashboard/boards/[id]/analytics/page.tsx`
  - [x] Server component following the link analytics page pattern
  - [x] Auth: `const session = await auth()` → notFound if no session
  - [x] Ownership: fetch board via `findBoardSummaryById(id)` → notFound if `board.userId !== userId`
  - [x] Parallel fetch via `Promise.all()`: overview, daily/weekly/monthly timeseries, referrers, geo
  - [x] Render sections: `<BoardAnalyticsHeader>`, `<BoardLinksTable>`, `<ClicksTimeseriesChart>`, grid row with `<ReferrerChart>` + `<GeoChart>`
  - [x] Reuse existing `ClicksTimeseriesChart`, `ReferrerChart`, `GeoChart` — they accept the same data shapes
  - [x] Add page test `src/app/(dashboard)/dashboard/boards/[id]/analytics/page.test.tsx`

- [x] Task 5: Add "Analytics" link on board detail page (AC: #1)
  - [x] Modify `src/app/(dashboard)/dashboard/boards/[id]/page.tsx`
  - [x] Add an "Analytics" button/link next to the existing Edit button
  - [x] Link to `/dashboard/boards/${board.id}/analytics`

- [x] Task 6: Validate end-to-end (AC: all)
  - [x] Verify board analytics page renders aggregate metrics for a board with links
  - [x] Verify per-link click comparison table shows correct counts
  - [x] Verify zero-state for empty board and for board with links but no clicks
  - [x] Verify ownership scoping — cannot see another user's board analytics
  - [x] Run `npm test` and `npm run lint` — no regressions

## Dev Notes

### Architecture Compliance

**Board Analytics Page Route** — from architecture doc:
- Page lives at `src/app/(dashboard)/dashboard/boards/[id]/analytics/page.tsx` (architecture spec: `boards/[id]/analytics/`)
- Implements FR20: Board-level aggregate analytics dashboard

**Analytics Visualization** — architecture mandates:
- Recharts for all charts (do NOT introduce another charting library)
- Client-render charts, server-side data fetching
- Text alternatives for screen readers (NFR23)
- Numeric labels on bars, not color-only (NFR24)

**Authorization: Ownership-based**
- Board ownership check: `boards.user_id = :currentUser`
- Analytics queries must also scope through `boards.user_id` to prevent data leaks

### Existing Code Integration Points

**Analytics Query Module** (`src/lib/db/analytics.ts`):
- Already exports: `getLinkAnalyticsOverview`, `getLinkClicksTimeseries`, `getLinkReferrerBreakdown`, `getLinkGeoBreakdown`
- Uses `Prisma.sql` raw queries with `prisma.$queryRaw`
- Ownership via `INNER JOIN public.links l ON l.id = ce.link_id WHERE l.user_id = CAST(${userId} AS uuid)`
- Board queries need an additional join: `INNER JOIN public.board_links bl ON bl.link_id = ce.link_id INNER JOIN public.boards b ON b.id = bl.board_id WHERE bl.board_id = CAST(${boardId} AS uuid) AND b.user_id = CAST(${userId} AS uuid)`
- Reuse existing types: `LinkClicksTimeseriesPoint`, `ReferrerBreakdownItem`, `GeoBreakdownItem`
- Reuse helpers: `formatBucketLabel()`, `getIsoWeek()`

**Board Queries** (`src/lib/db/boards.ts`):
- `findBoardSummaryById(id)` — lightweight board fetch with `_count.boardLinks` (use for ownership check)
- `findBoardById(id)` — full board with `boardLinks` and nested `link` (use if you need link details)

**Link Analytics Page** (`src/app/(dashboard)/dashboard/links/[id]/analytics/page.tsx`):
- Reference implementation — mirror this pattern exactly for the board analytics page
- Auth: `const session = await auth(); const userId = session?.user?.id;`
- Parallel fetch: `const [daily, weekly, monthly, referrers, geo] = await Promise.all([...])`
- Renders: header → timeseries chart → grid(referrer + geo)

**Existing Chart Components** (all reusable as-is):
- `src/components/analytics/clicks-timeseries-chart.tsx` — accepts `datasets: Record<"daily"|"weekly"|"monthly", LinkClicksTimeseriesPoint[]>` and `initialGranularity`
- `src/components/analytics/referrer-chart.tsx` — accepts `data: ReferrerBreakdownItem[]`
- `src/components/analytics/geo-chart.tsx` — accepts `data: GeoBreakdownItem[]`
- All three handle empty/zero-state internally

**Board Detail Page** (`src/app/(dashboard)/dashboard/boards/[id]/page.tsx`):
- Shows board name, description, visibility, link count, edit/delete buttons
- Add "Analytics" link button here pointing to `analytics/` sub-route

**Prisma Schema Relations** (`prisma/schema.prisma`):
```
Board → BoardLink (one-to-many via boardId)
BoardLink → Link (many-to-one via linkId)
Link → ClickEvent (one-to-many via linkId)
```
No direct Board → ClickEvent relation — must join through `board_links` → `links` → `click_events`.

### Query Strategy

**Board Analytics Overview Query (PostgreSQL):**
```sql
-- Total clicks for a board
SELECT COUNT(ce.id)::int AS total_clicks
FROM click_events ce
INNER JOIN board_links bl ON bl.link_id = ce.link_id
INNER JOIN boards b ON b.id = bl.board_id
WHERE bl.board_id = $1::uuid AND b.user_id = $2::uuid
```

**Per-Link Click Counts (for comparison table):**
```sql
SELECT l.id, l.slug, l.title, COUNT(ce.id)::int AS clicks
FROM links l
INNER JOIN board_links bl ON bl.link_id = l.id
LEFT JOIN click_events ce ON ce.link_id = l.id
WHERE bl.board_id = $1::uuid
  AND l.user_id = $2::uuid
GROUP BY l.id, l.slug, l.title
ORDER BY clicks DESC
```
Note: LEFT JOIN on `click_events` so links with zero clicks still appear.

**Board Timeseries Query:**
```sql
SELECT
  date_trunc($3, ce.clicked_at) AS period_start,
  COUNT(*)::int AS clicks
FROM click_events ce
INNER JOIN board_links bl ON bl.link_id = ce.link_id
INNER JOIN boards b ON b.id = bl.board_id
WHERE bl.board_id = $1::uuid AND b.user_id = $2::uuid
GROUP BY period_start
ORDER BY period_start ASC
```
Use same `formatBucketLabel()` and granularity parameter pattern as link timeseries.

**Board Referrer/Geo Queries:**
Same as link-level equivalents but with the additional `board_links` + `boards` join instead of direct `links` join.

### New Types

```typescript
export type BoardLinkClickItem = {
  id: string;
  slug: string;
  title: string | null;
  clicks: number;
};

export type BoardAnalyticsOverview = {
  boardName: string;
  totalClicks: number;
  linkCount: number;
  topLinks: BoardLinkClickItem[];
};
```

### Design System Consistency

Follow existing dashboard patterns from Story 6.2/6.3:
- Cards: `rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6`
- Section headers: `text-sm font-medium uppercase tracking-[0.3em] text-emerald-400`
- Headings: `text-2xl font-semibold tracking-tight text-zinc-100`
- Body text: `text-sm text-zinc-400`
- Chart colors: emerald accent (`#34d399`), dark tooltip (`backgroundColor: "#18181b"`, border `#3f3f46`)
- Interactive elements: min 44px touch target, `focus-visible:ring-2 focus-visible:ring-emerald-400/40`
- Zero-state: `rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center`
- Table rows: `border-b border-zinc-800`, hover `bg-zinc-800/50`

### Accessibility Guidance

- Board analytics header: provide `aria-label` with board name and total clicks
- Per-link table: use semantic `<table>` with `<thead>` / `<tbody>`, not divs
- Reused chart components already handle text alternatives and numeric labels
- Zero-state messages must be visible text, not dependent on chart rendering

### Previous Story Learnings

- **Story 6.3**: Recharts chart components are `"use client"` while page is server component passing data as props. Dark Tooltip needs explicit styling. 398 tests passing after implementation, lint clean.
- **Story 6.3 Code Review**: Fixed geo query SQL ordering issue — aggregate in subquery if referencing grouped column outside GROUP BY. Watch for this in board-level queries too.
- **Story 6.2**: `Pick<Link>` type collides with Next.js `Link` — use `PrismaLink` or `BoardLinkClickItem` custom types. Removed `as const` readonly arrays causing test type issues.
- **Story 3.3**: Known `npm run build` issue with `process.stdout` in Edge runtime (`src/lib/logger.ts:13`) — outside scope, ignore.

### Git Intelligence

Recent commits show:
- Story 6.3 added `referrer-chart.tsx`, `geo-chart.tsx` to `src/components/analytics/`
- Story 6.2 added `clicks-timeseries-chart.tsx`, `link-analytics-header.tsx`
- All chart components follow consistent Recharts + dark theme patterns
- Tests use Vitest + Testing Library, mock `$queryRaw` for DB tests

### Project Structure Notes

| Action | File | Notes |
|--------|------|-------|
| MODIFY | `src/lib/db/analytics.ts` | Add 4 board-level query functions + `BoardAnalyticsOverview` and `BoardLinkClickItem` types |
| MODIFY | `src/lib/db/analytics.test.ts` | Add tests for all 4 new board query functions |
| CREATE | `src/components/analytics/board-analytics-header.tsx` | Board overview KPI card |
| CREATE | `src/components/analytics/board-analytics-header.test.tsx` | Component tests |
| CREATE | `src/components/analytics/board-links-table.tsx` | Per-link click comparison table |
| CREATE | `src/components/analytics/board-links-table.test.tsx` | Component tests |
| CREATE | `src/app/(dashboard)/dashboard/boards/[id]/analytics/page.tsx` | Board analytics page (server component) |
| CREATE | `src/app/(dashboard)/dashboard/boards/[id]/analytics/page.test.tsx` | Page tests |
| MODIFY | `src/app/(dashboard)/dashboard/boards/[id]/page.tsx` | Add "Analytics" link button |

### Testing Guidance

- Follow Vitest + Testing Library conventions from existing analytics tests
- Mock `$queryRaw` in DB tests to verify SQL patterns and ownership filtering
- In component tests, verify rendered text (board name, click counts, link slugs, zero-state messages), not Tailwind classes
- Verify chart text alternatives are in the DOM for screen reader accessibility
- Verify unauthorized access returns notFound (null session and non-owner tests)
- Existing charts handle their own zero-state — test that board page passes empty arrays correctly

### Constraints / Anti-Patterns

- Do NOT add API endpoints — API board analytics belongs to Story 7.4
- Do NOT introduce a new charting library; reuse Recharts per architecture
- Do NOT create new chart components for referrer/geo/timeseries — reuse the existing ones from Story 6.2/6.3
- Do NOT bypass ownership filtering — always scope through `boards.user_id`
- Do NOT make chart components fetch their own data — server component passes data as props
- Do NOT create a Prisma migration — no schema changes needed, query through existing relations
- Do NOT import `Link` from Prisma where it could collide with Next.js `Link` — use custom types

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.4]
- [Source: _bmad-output/planning-artifacts/prd.md#FR20 — Board-level aggregate analytics]
- [Source: _bmad-output/planning-artifacts/architecture.md#boards/[id]/analytics/ route]
- [Source: _bmad-output/planning-artifacts/architecture.md#Charts/Analytics Visualization: Recharts]
- [Source: _bmad-output/implementation-artifacts/6-3-referrer-and-geographic-analytics.md]
- [Source: src/lib/db/analytics.ts — existing query patterns and types]
- [Source: src/lib/db/boards.ts — findBoardSummaryById for ownership check]
- [Source: src/components/analytics/ — reusable chart components]
- [Source: src/app/(dashboard)/dashboard/links/[id]/analytics/page.tsx — reference page implementation]
- [Source: prisma/schema.prisma — Board/BoardLink/Link/ClickEvent relations]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `npm test -- src/lib/db/analytics.test.ts src/components/analytics/board-analytics-header.test.tsx src/components/analytics/board-links-table.test.tsx src/app/(dashboard)/dashboard/boards/[id]/analytics/page.test.tsx`
- `npm test`
- `npm run lint`

### Completion Notes List

- Added ownership-scoped board analytics queries and board aggregate types in `src/lib/db/analytics.ts`.
- Added accessible board analytics KPI and per-link comparison components in `src/components/analytics/board-analytics-header.tsx` and `src/components/analytics/board-links-table.tsx`.
- Added the server-rendered board analytics route in `src/app/(dashboard)/dashboard/boards/[id]/analytics/page.tsx` with board ownership enforcement and shared chart reuse.
- Added board detail navigation to `/dashboard/boards/${board.id}/analytics` in `src/app/(dashboard)/dashboard/boards/[id]/page.tsx`.
- Verified regressions: `413 passed`, `9 skipped`; lint clean.

### File List

- `src/lib/db/analytics.ts`
- `src/lib/db/analytics.test.ts`
- `src/components/analytics/board-analytics-header.tsx`
- `src/components/analytics/board-analytics-header.test.tsx`
- `src/components/analytics/board-links-table.tsx`
- `src/components/analytics/board-links-table.test.tsx`
- `src/app/(dashboard)/dashboard/boards/[id]/analytics/page.tsx`
- `src/app/(dashboard)/dashboard/boards/[id]/analytics/page.test.tsx`
- `src/app/(dashboard)/dashboard/boards/[id]/page.tsx`
- `src/middleware.ts` (unrelated: waitUntil import refactor)
- `src/middleware.test.ts` (unrelated: test updates for middleware change)
- `src/lib/logger.ts` (unrelated: process.stdout → console refactor)
- `src/lib/logger.test.ts` (unrelated: test updates for logger change)
- `src/components/boards/board-link-add.tsx` (unrelated: type narrowing refactor)

### Change Log

- 2026-03-18: Implemented board-level aggregate analytics page, supporting queries, UI components, tests, and board detail navigation.
- 2026-03-18: [AI-Review] Added aria-label to BoardLinksTable for AC #4 compliance. Updated File List with unrelated git changes.
