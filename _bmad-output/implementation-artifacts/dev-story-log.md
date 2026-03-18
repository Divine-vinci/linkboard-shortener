## Story 3.2 — Dev Complete
- Story file: `_bmad-output/implementation-artifacts/3-2-edit-and-delete-boards.md`
- Status: `review`
- Sprint status: `3-2-edit-and-delete-boards: review`
- AC1/AC5: `src/lib/validations/board.ts`, `src/components/boards/board-edit-form.tsx`, `src/components/boards/board-edit-form.test.tsx`
- AC1/AC2/AC3/AC4: `src/lib/db/boards.ts`, `src/app/api/v1/boards/[id]/route.ts`, `src/app/api/v1/boards/[id]/route.test.ts`
- AC2: `src/components/boards/board-delete-button.tsx`, `src/components/boards/board-delete-button.test.tsx`
- AC1/AC2 UI wiring: `src/app/(dashboard)/dashboard/boards/[id]/edit/page.tsx`, `src/app/(dashboard)/dashboard/boards/[id]/page.tsx`
- Validation: `npm test` → 294 passed / 8 skipped; `npm run lint` → pass



## Dev Story Finalization — 2026-03-18
- Final step reached for active `dev-story` workflow.
- Verification command: `pnpm test -- --runInBand`
- Result: 41 test files passed, 296 tests passed.
- Skips observed: 1 file skipped / 8 tests skipped due to unavailable DB (`src/lib/db/users.test.ts`, `src/lib/db/links.test.ts`).
- BMAD step source: `bmad_load_step` returned `This is the final step of the "dev-story" workflow. Call bmad_complete_workflow to finalize.`


## Story 3.3 Implementation
- AC1 `src/app/api/v1/boards/[id]/links/route.ts`, `src/lib/db/board-links.ts`, `src/components/boards/board-link-add.tsx`: add existing library links to owned boards at tail position.
- AC2 `src/app/api/v1/boards/[id]/links/[linkId]/route.ts`, `src/lib/db/board-links.ts`, `src/app/(dashboard)/dashboard/boards/[id]/page.tsx`: remove board links without deleting source links and recompact positions.
- AC3 `src/app/api/v1/boards/[id]/links/route.ts`, `src/app/api/v1/boards/[id]/links/[linkId]/route.ts`: return 404 on non-owner board access.
- AC4 `src/app/api/v1/boards/[id]/links/route.ts`: map duplicate board-link unique constraint to 409 conflict.
- Tests: `npm test` = 312 passed / 8 skipped; `npm run lint` = pass.
- Known pre-existing blocker: `npm run build` still fails in `src/lib/logger.ts:13` (`process.stdout` in Edge runtime), outside Story 3.3 scope.