## Dev Story Result — Story 7.2 Links REST API Endpoints

### Status
- Completed AC1–AC6.

### Files Added
- `src/lib/auth/api-key-middleware.ts`
- `src/lib/auth/api-key-middleware.test.ts`
- `src/lib/validations/api-link.ts`

### Files Updated
- `src/lib/validations/link.ts` — exported `httpUrlSchema`, `emptyStringToUndefined`
- `src/lib/db/links.ts` — added `findLinksWithOffset()` for offset pagination
- `src/app/api/v1/links/route.ts` — dual auth, API `slug` support, offset pagination
- `src/app/api/v1/links/[id]/route.ts` — added `GET`, dual auth for `PATCH`/`DELETE`
- `src/app/api/v1/links/route.test.ts`
- `src/app/api/v1/links/[id]/route.test.ts`

### Acceptance Criteria Coverage
- AC1: `POST /api/v1/links` supports `Authorization: Bearer <key>` and returns `201 { data: link }`.
- AC2: `GET /api/v1/links` supports `search`, `sortBy`, `limit`, `offset`; returns ownership-scoped `{ data, pagination }`.
- AC3: `GET /api/v1/links/{id}` added with ownership-scoped `404` behavior.
- AC4: `PATCH /api/v1/links/{id}` supports API key auth and existing cache-invalidating update flow.
- AC5: `DELETE /api/v1/links/{id}` supports API key auth and existing cache-invalidating delete flow with `204`.
- AC6: Zod validation added via `src/lib/validations/api-link.ts`; invalid auth returns `401`.

### Verification
- `npx vitest run src/lib/auth/api-key-middleware.test.ts src/app/api/v1/links/route.test.ts src/app/api/v1/links/[id]/route.test.ts` ✅ 41 passed
- `npm test` ✅ 432 passed, 9 skipped
- `npm run lint` ✅ passed

### Notes
- Dual-auth resolution prefers API key auth, then falls back to session auth.
- API create payload accepts `slug`; existing frontend payloads using `customSlug` remain supported.
- API list mode uses offset pagination only when `offset`, `search`, or `sortBy` is present, preserving existing frontend page-based queries.
