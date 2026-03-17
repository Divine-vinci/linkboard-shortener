# Code Review — Story 1.7 User Profile Management

Initial fallback review found a partial-update data integrity issue in `src/app/api/v1/user/profile/route.ts`: `PATCH {}` could clear the stored `name` by writing `null` when `name` was omitted. Fixed by only including `name` in the update payload when it is explicitly present.

## Review outcome
- Final verdict: pass after fix
- Concrete issue fixed:
  - `src/app/api/v1/user/profile/route.ts` — medium severity partial-update bug on omitted `name`
- Regression coverage added:
  - `src/app/api/v1/user/profile/route.test.ts` now verifies `PATCH {}` does not clear the existing name

## Validation
- `npm test` ✅ (`90 passed`, `2 skipped` for unreachable `DATABASE_URL` CRUD tests)
- `npm run lint` ✅
- `npx tsc --noEmit` ✅
- `npm run build` ✅
- Non-blocking warning: Next.js `middleware` convention deprecated in favor of `proxy`

## Commit safety
- Safe to commit/push after the fix
- No blockers
