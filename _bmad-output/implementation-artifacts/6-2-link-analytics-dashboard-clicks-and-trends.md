# Story 6.2: Link Analytics Dashboard — Clicks and Trends

Status: ready-for-dev

## Story

As a logged-in user,
I want to view total click counts and time-series trends for my links,
So that I can understand how my links are performing over time.

## Acceptance Criteria

1. **Given** I navigate to a link's detail/analytics page
   **When** the page loads
   **Then** I see the total click count for the link (FR16)
   **And** I see a time-series chart (Recharts) showing clicks over time with toggleable aggregation: daily, weekly, monthly (FR17)
   **And** the chart provides text alternatives for screen readers (NFR23)

2. **Given** a link has no clicks yet
   **When** I view its analytics
   **Then** I see a zero-state with "No clicks yet" and the time-series chart is empty

3. **Given** I only own this link
   **When** analytics data is queried
   **Then** only click events for my links are returned (NFR13)

## Tasks / Subtasks

- [ ] Task 0: Install Recharts dependency
  - [ ] Run `npm install recharts`
  - [ ] Verify Recharts is added to `package.json` dependencies

- [ ] Task 1: Add ownership-scoped analytics read queries (AC: #1, #2, #3)
  - [ ] Create `src/lib/db/analytics.ts`
  - [ ] Implement `getLinkAnalyticsOverview(userId: string, linkId: string)` returning link metadata + total click count
  - [ ] Implement `getLinkClicksTimeseries(userId: string, linkId: string, granularity: "daily" | "weekly" | "monthly")`
  - [ ] Ensure all analytics queries join/filter on `Link.userId = userId` so users can only read their own link analytics
  - [ ] Return stable zero-value payloads when the link has no clicks yet
  - [ ] Add unit tests in `src/lib/db/analytics.test.ts` for ownership filtering, zero-state behavior, and aggregation buckets

- [ ] Task 2: Create the link analytics page route (AC: #1, #2, #3)
  - [ ] Create `src/app/(dashboard)/dashboard/links/[id]/analytics/page.tsx`
  - [ ] Resolve the session user via existing dashboard auth patterns
  - [ ] Load overview + timeseries data server-side for the selected link
  - [ ] Handle missing/unauthorized links with the project's existing not-found pattern
  - [ ] Render total clicks summary, aggregation controls, and chart section
  - [ ] Render an explicit empty state with copy: `No clicks yet`

- [ ] Task 3: Build reusable analytics UI components (AC: #1, #2)
  - [ ] Create `src/components/analytics/link-analytics-header.tsx` for link slug/target context + total clicks KPI
  - [ ] Create `src/components/analytics/clicks-timeseries-chart.tsx` using Recharts
  - [ ] Add a daily / weekly / monthly aggregation toggle with accessible button semantics
  - [ ] Ensure the chart has a text alternative / summary for screen readers describing the displayed dataset
  - [ ] Ensure the zero-state is understandable without relying on chart color or visuals
  - [ ] Add component tests for rendered totals, zero-state copy, toggle interactions, and accessible text alternatives

- [ ] Task 4: Link existing dashboard surfaces to analytics (AC: #1)
  - [ ] Update `src/components/links/link-library.tsx` to expose a clear analytics entry point for each link
  - [ ] Replace placeholder click/analytics affordances with navigation to the new analytics page where appropriate
  - [ ] Preserve current edit/delete behavior and existing layout responsiveness
  - [ ] Add/update tests covering the analytics navigation affordance

- [ ] Task 5: Validate end-to-end analytics rendering (AC: all)
  - [ ] Verify a link with click events shows the correct total click count and non-empty chart data
  - [ ] Verify daily / weekly / monthly aggregation switches update the visible dataset correctly
  - [ ] Verify a link with zero click events shows `No clicks yet` and an empty chart state
  - [ ] Run targeted tests for analytics DB/UI/page changes
  - [ ] Run the full test suite and lint to confirm no regressions

## Dev Notes

### Architecture Compliance

**Analytics Visualization** — from architecture doc:
- Use Recharts for dashboard analytics visualization
- Client-render the chart while keeping data fetching in server components
- Provide text alternatives for screen readers (NFR23)

**Authorization: Ownership-based**
- Every analytics read must be filtered by the current authenticated user
- Query pattern remains `WHERE link.user_id = :currentUser`
- No cross-user analytics reads, even if a valid link id is guessed

**Analytics Dependency Chain**
- Story 6.1 already captures click events into `click_events`
- Story 6.2 consumes that data for link-level totals + trend visualization
- Do not implement referrer or geographic breakdowns here; those belong to Story 6.3
- Do not implement board-level analytics here; that belongs to Story 6.4

### Existing Code Integration Points

**ClickEvent Model** (`prisma/schema.prisma`):
```prisma
model ClickEvent {
  id        String   @id @default(uuid()) @db.Uuid
  linkId    String   @map("link_id") @db.Uuid
  clickedAt DateTime @default(now()) @map("clicked_at")
  referrer  String?
  country   String?
  userAgent String   @default("unknown") @map("user_agent")
  link      Link     @relation(fields: [linkId], references: [id], onDelete: Cascade)

  @@index([linkId, clickedAt], map: "idx_click_events_link_id_clicked_at")
  @@map("click_events")
  @@schema("public")
}
```

**Analytics Placeholder Route**
- `src/app/(dashboard)/dashboard/analytics/page.tsx` currently contains only a placeholder view introduced in Epic 4
- Story 6.2 should add a concrete per-link analytics route instead of overloading the placeholder page

**Links Dashboard Surface**
- `src/components/links/link-library.tsx` line 222 currently renders `Clicks: —` as a placeholder badge
- Use this surface to add a route into per-link analytics without regressing edit/delete actions
- The link library test at `src/components/links/link-library.test.tsx` line 47 asserts this placeholder text

**Captured Event Source**
- Story 6.1 created `click_events` storage via `prisma/schema.prisma` and `src/lib/analytics/capture.ts`
- Read-side aggregation in this story must use those persisted events as the single source of truth

**Prisma Client** (`src/lib/db/client.ts`):
- Singleton pattern for Prisma client — import from here for all DB queries

**Existing DB Query Patterns** (`src/lib/db/links.ts`, `src/lib/db/boards.ts`):
- All query functions accept `userId` and filter by ownership
- Return typed results using Prisma generated types

**Auth Pattern**:
- Use `const session = await auth()` from `@/lib/auth/config` to get current session
- Access `session.user.id` for the authenticated user ID

**Route Structure**:
- `src/app/(dashboard)/dashboard/links/page.tsx` re-exports from `../../links/page.tsx`
- New analytics route goes at `src/app/(dashboard)/dashboard/links/[id]/analytics/page.tsx`
- No `[id]` route exists yet under the links directory

### Query + Aggregation Guidance

- Prefer Prisma or parameterized SQL that groups by bucketed `clicked_at`
- Daily: by calendar day
- Weekly: by ISO week or a consistent week bucket definition used across tests
- Monthly: by calendar month
- Return normalized chart rows shaped for Recharts, e.g. `{ label, clicks }`
- Keep bucket ordering ascending by time for chart rendering
- Empty datasets should return `[]`, not `null`

### Recharts Usage

Recharts renders on the client side. The chart component must be a Client Component (`"use client"`). The page itself should be a Server Component that passes data as props:

```typescript
// Server Component (page.tsx)
const timeSeriesData = await getLinkClicksTimeseries(userId, linkId, "daily");
return <ClicksTimeseriesChart initialData={timeSeriesData} />;

// Client Component (clicks-timeseries-chart.tsx)
"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
```

### Time-Series Query Strategy (PostgreSQL)

Use PostgreSQL's native `date_trunc` for efficient time bucketing:

```typescript
const results = await prisma.$queryRaw`
  SELECT date_trunc('day', ce.clicked_at) as period, COUNT(*)::int as count
  FROM click_events ce
  JOIN links l ON l.id = ce.link_id
  WHERE ce.link_id = ${linkId}::uuid AND l.user_id = ${userId}::uuid
  GROUP BY period
  ORDER BY period ASC
`;
```

Use `'week'` or `'month'` for weekly/monthly aggregation.

### Design System Consistency

Follow existing dashboard patterns:
- Cards: `rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6`
- Section headers: `text-sm font-medium uppercase tracking-[0.3em] text-emerald-400`
- Headings: `text-2xl font-semibold tracking-tight text-zinc-100`
- Body text: `text-sm text-zinc-400`
- Interactive elements: minimum 44px touch target, visible focus indicators (`focus:ring-2 focus:ring-emerald-400/40`)

### Accessibility Guidance

- Aggregation controls must be keyboard reachable and expose the active selection
- Provide a text summary near the chart, e.g. total clicks and date span / bucket count
- Zero-state copy must remain visible even if the chart renders an empty grid
- Do not use color alone to communicate trends or the active state

### Previous Story Learnings

- **Story 6.1**: Analytics capture module (`src/lib/analytics/capture.ts`) fully implemented. Input truncation applied. 379 tests passing after code review fixes.
- **Epic 5 learnings**: Avoid Tailwind class name assertions in tests; verify semantic HTML nesting for accessibility (no `<p>` inside `<p>`).
- **Story 3.3**: Known pre-existing issue with `npm run build` failing in `src/lib/logger.ts:13` (`process.stdout` in Edge runtime) — outside this story's scope.

### File Structure

| Action | File | Notes |
|--------|------|-------|
| CREATE | `src/lib/db/analytics.ts` | Ownership-scoped analytics read functions |
| CREATE | `src/lib/db/analytics.test.ts` | Unit tests for totals, bucketing, and auth scoping |
| CREATE | `src/app/(dashboard)/dashboard/links/[id]/analytics/page.tsx` | Server-rendered analytics page |
| CREATE | `src/components/analytics/link-analytics-header.tsx` | KPI/header block |
| CREATE | `src/components/analytics/clicks-timeseries-chart.tsx` | Recharts visualization + a11y text alternative |
| MODIFY | `src/components/links/link-library.tsx` | Add analytics navigation entry point |
| MODIFY | `src/components/links/link-library.test.tsx` | Cover analytics affordance |
| MODIFY | `package.json` | Add recharts dependency |

### Testing Guidance

- Follow existing Vitest + Testing Library conventions used across dashboard components
- Mock database reads in component/page tests; keep query logic tested in `src/lib/db/analytics.test.ts`
- Verify unauthorized access does not leak totals or chart rows
- Prefer behavioral assertions over Tailwind class assertions
- Keep chart tests focused on rendered labels/text alternatives and toggle-driven dataset swaps

### Constraints / Anti-Patterns

- Do NOT add analytics API endpoints in this story — API analytics belongs to Story 7.4
- Do NOT implement referrer breakdowns or geo charts here — that is Story 6.3
- Do NOT aggregate board-level metrics here — that is Story 6.4
- Do NOT bypass ownership filtering by querying `click_events` without joining to `links`
- Do NOT introduce a new charting library; use Recharts per architecture
- Do NOT make the page client-only for data fetching if server-side loading can provide the initial dataset

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authorization: Ownership-based]
- [Source: _bmad-output/planning-artifacts/architecture.md#Charts/Analytics Visualization: Recharts]
- [Source: src/components/links/link-library.tsx — placeholder click badge]
- [Source: src/app/(dashboard)/dashboard/analytics/page.tsx — current placeholder analytics route]
- [Source: _bmad-output/implementation-artifacts/6-1-click-event-capture-during-redirects.md]

## Dev Agent Record

### Agent Model Used

<!-- to be filled by dev agent -->

### Completion Notes List

- Initial draft recovered by gpt-5.4 after ACP polling returned no transcript output.
- Finalized to ready-for-dev by claude-opus-4-6 with enriched integration context, Recharts guidance, query strategy, design system patterns, and previous story learnings.

### File List

- _bmad-output/implementation-artifacts/6-2-link-analytics-dashboard-clicks-and-trends.md

### Change Log

- 2026-03-18: Initial draft reconstructed locally (gpt-5.4).
- 2026-03-18: Finalized to ready-for-dev with enriched dev notes (claude-opus-4-6).
