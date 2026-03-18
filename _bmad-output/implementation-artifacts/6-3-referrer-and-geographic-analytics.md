# Story 6.3: Referrer and Geographic Analytics

Status: review

## Story

As a logged-in user,
I want to view top referrer sources and geographic distribution for my links,
so that I know where my traffic is coming from.

## Acceptance Criteria

1. **Given** I am viewing a link's analytics page
   **When** I scroll to the referrer section
   **Then** I see a chart/list showing the top referrer domains ranked by click count (FR18)
   **And** referrers are grouped by domain (e.g., "twitter.com", "google.com", "direct")

2. **Given** I scroll to the geographic section
   **When** the data loads
   **Then** I see a chart/table showing click distribution by country (ISO 3166-1) (FR19)

3. **And** all charts provide text alternatives for screen readers (NFR23)
   **And** color is not the sole means of conveying information in charts (NFR24)

4. **Given** I only own this link
   **When** analytics data is queried
   **Then** only click events for my links are returned (NFR13)

5. **Given** a link has no referrer or geographic data
   **When** the sections load
   **Then** I see appropriate zero-state messages instead of empty charts

## Tasks / Subtasks

- [x] Task 1: Add referrer and geographic analytics DB queries (AC: #1, #2, #4)
  - [x] Add `getLinkReferrerBreakdown(userId, linkId)` to `src/lib/db/analytics.ts`
  - [x] Add `getLinkGeoBreakdown(userId, linkId)` to `src/lib/db/analytics.ts`
  - [x] Referrer query: extract domain from `referrer` column, group by domain, count clicks, order DESC, limit top 10
  - [x] Null/empty referrers grouped as "Direct / Unknown"
  - [x] Geographic query: group by `country` column, count clicks, order DESC
  - [x] Null countries grouped as "Unknown"
  - [x] Both queries must join on `links` and filter by `user_id` for ownership scoping
  - [x] Add tests in `src/lib/db/analytics.test.ts`

- [x] Task 2: Build referrer breakdown chart component (AC: #1, #3)
  - [x] Create `src/components/analytics/referrer-chart.tsx`
  - [x] Use Recharts `BarChart` (horizontal bars) for top referrer domains
  - [x] Show click count label next to each bar (not color-only)
  - [x] Add text summary for screen readers with top referrer and total count
  - [x] Handle zero-state: "No referrer data yet"
  - [x] Add component test `src/components/analytics/referrer-chart.test.tsx`

- [x] Task 3: Build geographic distribution component (AC: #2, #3)
  - [x] Create `src/components/analytics/geo-chart.tsx`
  - [x] Use Recharts `BarChart` (horizontal bars) showing clicks per country
  - [x] Display country name alongside ISO code (use a simple mapping for common countries)
  - [x] Show click count label next to each bar
  - [x] Add text summary for screen readers with top country and total count
  - [x] Handle zero-state: "No geographic data yet"
  - [x] Add component test `src/components/analytics/geo-chart.test.tsx`

- [x] Task 4: Integrate into link analytics page (AC: all)
  - [x] Modify `src/app/(dashboard)/dashboard/links/[id]/analytics/page.tsx`
  - [x] Fetch referrer and geo data server-side alongside existing overview/timeseries
  - [x] Render ReferrerChart and GeoChart below the existing timeseries chart
  - [x] Update page test to cover new sections

- [x] Task 5: Validate end-to-end (AC: all)
  - [x] Verify referrer chart shows grouped domains with click counts
  - [x] Verify geo chart shows country distribution with click counts
  - [x] Verify zero-state renders for links with no click data
  - [x] Verify ownership scoping prevents cross-user data leaks
  - [x] Run `npm test` and `npm run lint` — no regressions

## Dev Notes

### Architecture Compliance

**Analytics Visualization** — from architecture doc:
- Use Recharts for all analytics charts (architecture mandates Recharts)
- Client-render charts while keeping data fetching in server components
- Provide text alternatives for screen readers (NFR23)
- Color must not be the sole means of conveying info (NFR24) — always show numeric labels alongside bars

**Authorization: Ownership-based**
- Every analytics read must filter by `links.user_id = :currentUser`
- Reuse the same ownership-join pattern from `getLinkClicksTimeseries`

**Analytics Dependency Chain**
- Story 6.1 captures click events with `referrer` and `country` fields already populated
- Story 6.2 built the analytics page and timeseries chart — extend that page
- Story 6.4 will build board-level aggregates — do NOT implement board analytics here

### Existing Code Integration Points

**ClickEvent Model** (`prisma/schema.prisma:57-69`):
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
}
```

Key: `referrer` stores the full URL (captured via `request.headers.get("referer")` in `src/lib/analytics/capture.ts`). `country` stores the ISO 3166-1 code (from `x-vercel-ip-country` header or `request.geo?.country`). Both fields are nullable.

**Existing Analytics Module** (`src/lib/db/analytics.ts`):
- Already exports `getLinkAnalyticsOverview` and `getLinkClicksTimeseries`
- Uses `Prisma.sql` raw queries with `$queryRaw` for aggregation
- Ownership scoping via `INNER JOIN public.links l ON l.id = ce.link_id WHERE l.user_id = CAST(${userId} AS uuid)`
- Add new functions to this same file following the same pattern

**Existing Analytics Page** (`src/app/(dashboard)/dashboard/links/[id]/analytics/page.tsx`):
- Server component that fetches overview + timeseries data
- Renders `LinkAnalyticsHeader` and `ClicksTimeseriesChart`
- Auth pattern: `const session = await auth(); const userId = session?.user?.id;`
- Extend this page to also fetch and render referrer + geo data below existing content

**Existing Chart Components** (`src/components/analytics/`):
- `clicks-timeseries-chart.tsx` — Recharts `LineChart`, dark theme with emerald accent
- `link-analytics-header.tsx` — KPI header card
- New charts must match the same visual design system

### Query Strategy

**Referrer Breakdown Query (PostgreSQL):**
```sql
SELECT
  CASE
    WHEN ce.referrer IS NULL OR ce.referrer = '' THEN 'Direct / Unknown'
    ELSE split_part(
      regexp_replace(ce.referrer, '^https?://(www\.)?', ''),
      '/', 1
    )
  END AS domain,
  COUNT(*)::int AS clicks
FROM click_events ce
INNER JOIN links l ON l.id = ce.link_id
WHERE ce.link_id = $1::uuid AND l.user_id = $2::uuid
GROUP BY domain
ORDER BY clicks DESC
LIMIT 10
```

**Geographic Breakdown Query:**
```sql
SELECT
  COALESCE(ce.country, 'Unknown') AS country,
  COUNT(*)::int AS clicks
FROM click_events ce
INNER JOIN links l ON l.id = ce.link_id
WHERE ce.link_id = $1::uuid AND l.user_id = $2::uuid
GROUP BY country
ORDER BY clicks DESC
```

### Return Types

```typescript
export type ReferrerBreakdownItem = {
  domain: string;
  clicks: number;
};

export type GeoBreakdownItem = {
  country: string;
  clicks: number;
};
```

### Design System Consistency

Follow existing dashboard patterns established in Story 6.2:
- Cards: `rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6`
- Section headers: `text-sm font-medium uppercase tracking-[0.3em] text-emerald-400`
- Headings: `text-2xl font-semibold tracking-tight text-zinc-100`
- Body text: `text-sm text-zinc-400`
- Chart colors: emerald accent (`#34d399`), dark theme tooltip (`backgroundColor: "#18181b"`, border `#3f3f46`)
- Interactive elements: min 44px touch target, `focus-visible:ring-2 focus-visible:ring-emerald-400/40`
- Zero-state: `rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center`

### Country Name Display

For displaying country names alongside ISO codes, use a simple inline mapping for the most common countries (US, GB, DE, FR, JP, CN, BR, IN, CA, AU, etc.) with a fallback showing just the ISO code. Do NOT add a heavy i18n library for this — a ~30 entry object literal is sufficient.

### Accessibility Guidance

- Each chart must have a text summary describing the data (e.g., "Top referrer: twitter.com with 142 clicks out of 350 total")
- Bar charts must show numeric labels on or next to bars — color alone is insufficient
- Use `aria-label` on chart sections
- Zero-state copy must be visible without relying on chart rendering

### Previous Story Learnings

- **Story 6.2**: Recharts renders client-side — chart components must be `"use client"` while the page is a server component passing data as props. Dark-themed Tooltip styling needed explicitly. 392 tests passing after code review.
- **Story 6.2 Code Review**: Fixed `Pick<Link>` type collision with Next.js Link — use `PrismaLink` or specific Prisma types. Added null session test coverage. Removed `as const` readonly incompatibility in test data.
- **Story 6.1**: `captureClickEvent` in `src/lib/analytics/capture.ts` truncates referrer to 2048 chars, country to 10 chars. Domain extraction in queries must handle these truncated values gracefully.
- **Epic 5**: Avoid Tailwind class name assertions in tests; use semantic HTML assertions instead.
- **Story 3.3**: Known `npm run build` issue with `process.stdout` in Edge runtime (`src/lib/logger.ts:13`) — outside scope.

### Project Structure Notes

| Action | File | Notes |
|--------|------|-------|
| MODIFY | `src/lib/db/analytics.ts` | Add `getLinkReferrerBreakdown` and `getLinkGeoBreakdown` |
| MODIFY | `src/lib/db/analytics.test.ts` | Add tests for new query functions |
| CREATE | `src/components/analytics/referrer-chart.tsx` | Recharts BarChart for referrer domains |
| CREATE | `src/components/analytics/referrer-chart.test.tsx` | Component tests |
| CREATE | `src/components/analytics/geo-chart.tsx` | Recharts BarChart for country distribution |
| CREATE | `src/components/analytics/geo-chart.test.tsx` | Component tests |
| MODIFY | `src/app/(dashboard)/dashboard/links/[id]/analytics/page.tsx` | Add referrer + geo sections |
| MODIFY | `src/app/(dashboard)/dashboard/links/[id]/analytics/page.test.tsx` | Cover new sections |

### Testing Guidance

- Follow Vitest + Testing Library conventions used in existing analytics tests
- Mock `$queryRaw` in DB tests to verify correct SQL patterns and ownership filtering
- In component tests, verify rendered text (domain names, click counts, zero-state messages), not Tailwind classes
- Verify chart text alternatives are in the DOM for screen reader accessibility
- Verify unauthorized access returns no data (null session test)

### Constraints / Anti-Patterns

- Do NOT add API endpoints — API analytics belongs to Story 7.4
- Do NOT implement board-level analytics — that is Story 6.4
- Do NOT introduce a new charting library; use Recharts per architecture
- Do NOT add a map visualization or geo library — simple bar chart / table is sufficient for MVP
- Do NOT bypass ownership filtering — always join `click_events` to `links` on `user_id`
- Do NOT make chart components fetch their own data — server component passes data as props

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Charts/Analytics Visualization: Recharts]
- [Source: _bmad-output/planning-artifacts/architecture.md#components/analytics/ directory structure]
- [Source: _bmad-output/implementation-artifacts/6-2-link-analytics-dashboard-clicks-and-trends.md]
- [Source: _bmad-output/implementation-artifacts/6-1-click-event-capture-during-redirects.md]
- [Source: src/lib/db/analytics.ts — existing query patterns]
- [Source: src/lib/analytics/capture.ts — referrer/country capture logic]
- [Source: src/components/analytics/clicks-timeseries-chart.tsx — Recharts patterns and design system]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `npm test -- src/lib/db/analytics.test.ts src/components/analytics/referrer-chart.test.tsx src/components/analytics/geo-chart.test.tsx src/app/(dashboard)/dashboard/links/[id]/analytics/page.test.tsx`
- `npm test`
- `npm run lint && echo LINT_OK`

### Completion Notes List

- Added ownership-scoped referrer and geo aggregations in `src/lib/db/analytics.ts`.
- Added accessible Recharts bar-chart sections with explicit numeric labels and zero states in `src/components/analytics/referrer-chart.tsx` and `src/components/analytics/geo-chart.tsx`.
- Extended `src/app/(dashboard)/dashboard/links/[id]/analytics/page.tsx` to fetch/render referrer + geo analytics server-side.
- Verified regression suite: `398 passed`, `9 skipped`; lint clean via `LINT_OK`.

### File List

- `src/lib/db/analytics.ts`
- `src/lib/db/analytics.test.ts`
- `src/components/analytics/referrer-chart.tsx`
- `src/components/analytics/referrer-chart.test.tsx`
- `src/components/analytics/geo-chart.tsx`
- `src/components/analytics/geo-chart.test.tsx`
- `src/app/(dashboard)/dashboard/links/[id]/analytics/page.tsx`
- `src/app/(dashboard)/dashboard/links/[id]/analytics/page.test.tsx`
