# Story 3.5 — Dev Result

- Story file: `_bmad-output/implementation-artifacts/3-5-board-detail-view-with-link-metadata.md`
- Status: `review`
- Sprint status: `3-5-board-detail-view-with-link-metadata: review`
- AC2 `src/app/(dashboard)/dashboard/boards/[id]/page.tsx`: passed `expiresAt` into `BoardLinkAdd` initial link payload.
- AC1/AC2/AC4 `src/components/boards/board-link-add.tsx`: added expiration-status helper, expiration badge variants, static `0 clicks` placeholder, list semantics, and `aria-label="Board links"`.
- AC2/AC4 `src/components/boards/board-link-add.test.tsx`: added expiration-state coverage, click-placeholder coverage, and list accessibility assertions.
- Validation: `npm test -- src/components/boards/board-link-add.test.tsx` → 9 passed; `npm run lint -- src/components/boards/board-link-add.tsx src/components/boards/board-link-add.test.tsx src/app/(dashboard)/dashboard/boards/[id]/page.tsx` → pass; `npm test` → 326 passed / 8 skipped.
