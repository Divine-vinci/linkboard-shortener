## Story 3.2 — Dev Complete
- Story file: `_bmad-output/implementation-artifacts/3-2-edit-and-delete-boards.md`
- Status: `review`
- Sprint status: `3-2-edit-and-delete-boards: review`
- AC1/AC5: `src/lib/validations/board.ts`, `src/components/boards/board-edit-form.tsx`, `src/components/boards/board-edit-form.test.tsx`
- AC1/AC2/AC3/AC4: `src/lib/db/boards.ts`, `src/app/api/v1/boards/[id]/route.ts`, `src/app/api/v1/boards/[id]/route.test.ts`
- AC2: `src/components/boards/board-delete-button.tsx`, `src/components/boards/board-delete-button.test.tsx`
- AC1/AC2 UI wiring: `src/app/(dashboard)/dashboard/boards/[id]/edit/page.tsx`, `src/app/(dashboard)/dashboard/boards/[id]/page.tsx`
- Validation: `npm test` → 294 passed / 8 skipped; `npm run lint` → pass
