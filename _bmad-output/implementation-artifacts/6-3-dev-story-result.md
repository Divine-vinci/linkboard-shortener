## Dev Story 6.3 — Referrer and Geographic Analytics
- AC1/AC4: Added ownership-scoped `getLinkReferrerBreakdown(userId, linkId)` in `src/lib/db/analytics.ts` with domain grouping, direct/unknown fallback, DESC ordering, top-10 limit.
- AC2/AC4: Added ownership-scoped `getLinkGeoBreakdown(userId, linkId)` in `src/lib/db/analytics.ts` with ISO-code grouping and `Unknown` fallback.
- AC1/AC3/AC5: Added `src/components/analytics/referrer-chart.tsx` + `src/components/analytics/referrer-chart.test.tsx` with Recharts horizontal bars, numeric labels, live summary text, and zero-state copy.
- AC2/AC3/AC5: Added `src/components/analytics/geo-chart.tsx` + `src/components/analytics/geo-chart.test.tsx` with Recharts horizontal bars, country-name mapping, numeric labels, live summary text, and zero-state copy.
- AC1-AC5: Updated `src/app/(dashboard)/dashboard/links/[id]/analytics/page.tsx` + `page.test.tsx` to fetch/render referrer + geo datasets server-side alongside overview/timeseries.
- Validation: `npm test -- src/lib/db/analytics.test.ts src/components/analytics/referrer-chart.test.tsx src/components/analytics/geo-chart.test.tsx src/app/(dashboard)/dashboard/links/[id]/analytics/page.test.tsx` ✅
- Validation: `npm test` => `398 passed`, `9 skipped` ✅
- Validation: `npm run lint && echo LINT_OK` ✅