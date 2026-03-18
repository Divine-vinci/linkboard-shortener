## Story 4.2 Dev Result
- AC1-AC4, AC6: Implemented `/dashboard` authenticated overview page with `RecentLinks`, `BoardsOverview`, `QuickActions`, and `EmptyState` components.
- AC1-AC2: Added `findRecentLinksByUserId(userId, limit)` in `src/lib/db/links.ts` and reused `findBoardsByUserId(userId)`.
- AC3, AC5: `QuickActions` and `EmptyState` expose inline `CreateLinkForm` plus `/dashboard/boards/new` CTA; `CreateLinkForm` refresh keeps recent links current after creation.
- Tests: `npm test` => 350 passed, 9 skipped. `npm run lint` => passed.
