## Dev Story 5.3 — Mobile-Optimized Public Board Layout
- AC1: `src/app/(public)/b/[slug]/page.tsx` mobile-first page padding/gaps tightened; SSR-only route preserved.
- AC1/AC4: `src/components/public/public-board-header.tsx` updated for stacked mobile metadata, wrapped long title/description/share path, and touch-friendly CTA sizing.
- AC1/AC3/AC4: `src/components/public/public-board-link-list.tsx` updated for single-column mobile cards, wrapped hostname/description/title, and preserved visible focus rings.
- AC5: Added responsive/accessibility assertions in `src/app/(public)/b/[slug]/page.test.tsx`, `src/components/public/public-board-header.test.tsx`, and `src/components/public/public-board-link-list.test.tsx`.
- Verification: `npm test` → 58 passed / 1 skipped, 373 passed / 9 skipped.
