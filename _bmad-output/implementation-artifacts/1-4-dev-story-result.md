## Dev Story Result — Story 1.4 Email/Password Login and Session Management

- AC1/AC4/AC8/AC9: Implemented `src/app/(auth)/login/page.tsx` + `src/components/auth/login-form.tsx` with shared `loginSchema`, inline field errors, generic invalid-credential messaging, loading state, and redirect to `/dashboard`.
- AC1/AC4/AC5/AC9: Implemented `src/app/api/v1/auth/login/route.ts` with JSON-body validation, generic `401` auth failures, IP-based failed-attempt limiting, `429` retry metadata, and `Retry-After` header.
- AC5: Added `src/lib/rate-limit.ts` with normalized client-IP extraction, in-memory failed-attempt tracking, and reset-after-success behavior.
- AC2/AC3/AC6/AC7/AC8: Added `src/middleware.ts`, `src/app/(dashboard)/layout.tsx`, `src/app/(dashboard)/page.tsx`, and `src/components/auth/logout-button.tsx` for dashboard protection, authenticated `/login` redirects, logout, and minimal protected entry routing.
- Tests: Added `src/app/api/v1/auth/login/route.test.ts`, `src/components/auth/login-form.test.tsx`, `src/middleware.test.ts`; extended `src/lib/validations/auth.test.ts`.
- Verification: `npm test` ✅, `npm run lint` ✅.