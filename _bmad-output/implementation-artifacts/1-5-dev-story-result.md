## Dev Story Result — Story 1.5 OAuth Login (GitHub and Google)

- AC1/AC2/AC3/AC4/AC5: Updated `src/lib/auth/config.ts` to register Credentials + GitHub + Google providers, preserve Prisma adapter + JWT sessions, route Auth.js errors back to `/login`, and enable trusted email-based account linking for matching OAuth emails.
- AC1/AC7: Added `src/components/auth/oauth-buttons.tsx`; rendered provider actions on `src/app/(auth)/login/page.tsx` and `src/app/(auth)/register/page.tsx` with keyboard-focus styling and existing email/password forms intact.
- AC6: Added `src/components/auth/auth-error-banner.tsx`; `/login` now reads Auth.js `error` query state and shows a generic callback-failure message instead of leaking provider details.
- AC1/AC5: Extended `src/config/env.ts`, `.env.example`, and `vitest.setup.ts` for required OAuth credentials and local/test validation coverage.
- Tests: Added `src/components/auth/oauth-buttons.test.tsx`, `src/components/auth/auth-error-banner.test.tsx`, and `src/lib/auth/config.test.ts`.
- Verification: `npm run lint` ✅, `npm test` ✅.
