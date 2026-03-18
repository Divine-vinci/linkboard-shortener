# Story 7.2: Links REST API Endpoints

Status: done

## Story

As an API consumer,
I want to create, read, update, and delete links via REST API,
so that I can manage links programmatically.

## Acceptance Criteria

1. **Given** I have a valid API key in the `Authorization: Bearer <key>` header, **When** I `POST /api/v1/links` with `{ targetUrl, slug?, title?, description?, tags?, expiresAt?, boardId? }`, **Then** a link is created and returned as `{ data: link }` with 201 status.

2. **Given** I have a valid API key, **When** I `GET /api/v1/links` with optional query params `?sortBy=createdAt&limit=20&offset=0&search=query`, **Then** I receive `{ data: [...links], pagination: { total, limit, offset } }` with 200 status, **And** only my own links are returned (NFR13).

3. **Given** I have a valid API key, **When** I `GET /api/v1/links/{id}`, **Then** I receive the link details if I own it, or 404 if not.

4. **Given** I have a valid API key, **When** I `PATCH /api/v1/links/{id}` with updated fields, **Then** the link is partially updated, cache invalidated, and returned with 200 status.

5. **Given** I have a valid API key, **When** I `DELETE /api/v1/links/{id}`, **Then** the link is deleted, cache invalidated, and 204 (no body) is returned.

6. **And** all API responses return in < 200ms at p95 (NFR2), **And** all input is validated with Zod schemas (NFR11), **And** invalid API keys return 401 `{ error: { code: "UNAUTHORIZED" } }`.

## Tasks / Subtasks

- [ ] Task 1: API key authentication middleware (AC: #6)
  - [ ] Create `src/lib/auth/api-key-middleware.ts` with `authenticateApiKey(request)` helper
  - [ ] Hash incoming Bearer token with `hashApiKey()` from `@/lib/auth/api-key`
  - [ ] Look up via `findApiKeyByHash()` from `@/lib/db/api-keys`
  - [ ] Update `lastUsedAt` on the ApiKey record after successful auth
  - [ ] Return `{ userId }` on success, or null on failure
  - [ ] Create `src/lib/auth/api-key-middleware.test.ts`

- [ ] Task 2: API link validation schemas (AC: #1, #2, #4)
  - [ ] Create `src/lib/validations/api-link.ts` with API-specific schemas
  - [ ] `apiCreateLinkSchema`: maps `slug` (not `customSlug`), reuses existing field schemas from `link.ts`
  - [ ] `apiListLinksQuerySchema`: validates `search`, `sortBy`, `limit` (1-100, default 20), `offset` (min 0, default 0)
  - [ ] `apiUpdateLinkSchema`: reuses `updateLinkSchema` from `link.ts`

- [ ] Task 3: API links route handlers (AC: #1, #2, #3)
  - [ ] Create `src/app/api/v1/links/api/route.ts` — GET (list) + POST (create) under `/api/v1/links/api` path **OR** add API-key-aware dual-auth to existing `src/app/api/v1/links/route.ts`
  - [ ] **Decision: Add dual-auth to existing routes.** The existing session-based routes at `/api/v1/links` should accept BOTH session auth and API key auth. This avoids duplicating routes and matches the architecture: "Same API consumed by SPA frontend and external developers."
  - [ ] In GET: accept `search`, `sortBy`, `limit`, `offset` query params (API-style pagination, not page-based)
  - [ ] In POST: accept `slug` field (mapped from API input; internally use the same `createLinkRecord` flow)
  - [ ] Create/update `src/app/api/v1/links/route.test.ts` with API key auth test cases

- [ ] Task 4: API links [id] route handlers (AC: #3, #4, #5)
  - [ ] Update `src/app/api/v1/links/[id]/route.ts` — add GET + dual-auth to PATCH and DELETE
  - [ ] GET: return `{ data: link }` with 200, or 404 if not found/not owned
  - [ ] PATCH: same as existing but with API key auth support
  - [ ] DELETE: same as existing but with API key auth support
  - [ ] Create/update `src/app/api/v1/links/[id]/route.test.ts` with API key auth test cases

- [ ] Task 5: Verify and run tests (AC: all)
  - [ ] Run `npm test` — all existing tests must still pass (434+ tests baseline)
  - [ ] Run `npm run lint` — must pass

## Dev Notes

### API Key Authentication Middleware (`src/lib/auth/api-key-middleware.ts`)

Create a reusable helper for authenticating API key requests. This will be reused by Stories 7.3 and 7.4.

```typescript
import { hashApiKey } from "@/lib/auth/api-key";
import { findApiKeyByHash } from "@/lib/db/api-keys";
import { prisma } from "@/lib/db/client";

export type ApiKeyAuthResult = {
  userId: string;
  apiKeyId: string;
};

/**
 * Authenticate a request using the Authorization: Bearer <api-key> header.
 * Updates lastUsedAt on successful auth.
 * Returns null if no valid API key found.
 */
export async function authenticateApiKey(request: Request): Promise<ApiKeyAuthResult | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const rawKey = authHeader.slice(7);
  if (!rawKey) {
    return null;
  }

  const keyHash = hashApiKey(rawKey);
  const apiKey = await findApiKeyByHash(keyHash);
  if (!apiKey) {
    return null;
  }

  // Fire-and-forget lastUsedAt update (don't block the response)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return { userId: apiKey.userId, apiKeyId: apiKey.id };
}
```

**Critical:** Never log the raw key or hash. Only log `apiKeyId` for debugging.

### Dual-Auth Pattern for Route Handlers

The existing routes use `auth()` for session auth. Add a helper to try both auth methods:

```typescript
import { auth } from "@/lib/auth/config";
import { authenticateApiKey } from "@/lib/auth/api-key-middleware";

async function resolveUserId(request: Request): Promise<string | null> {
  // Try API key auth first (cheaper — no session DB lookup)
  const apiKeyAuth = await authenticateApiKey(request);
  if (apiKeyAuth) {
    return apiKeyAuth.userId;
  }

  // Fall back to session auth
  const session = await auth();
  return session?.user?.id ?? null;
}
```

Place this in the route file or in the middleware file. Use it in every route handler instead of the current `auth()` + manual check pattern.

### API-Specific Validation Schemas (`src/lib/validations/api-link.ts`)

The existing `createLinkSchema` uses `customSlug` but the API spec uses `slug`. Create thin API wrappers:

```typescript
import { z } from "zod";
import {
  customSlugSchema,
  optionalTitleSchema,
  optionalDescriptionSchema,
  optionalTagsSchema,
  optionalExpiresAtSchema,
} from "@/lib/validations/link";

// API uses "slug" not "customSlug"
export const apiCreateLinkSchema = z.object({
  targetUrl: httpUrlSchema,  // reuse from link.ts (export it first)
  slug: z.preprocess(emptyStringToUndefined, customSlugSchema.optional()),
  title: optionalTitleSchema,
  description: optionalDescriptionSchema,
  tags: optionalTagsSchema,
  expiresAt: optionalExpiresAtSchema,
  boardId: z.preprocess(emptyStringToUndefined, z.string().uuid().optional()),
});

// API uses offset-based pagination (not page-based)
export const apiListLinksQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  sortBy: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
```

**Note:** You'll need to export `httpUrlSchema` and `emptyStringToUndefined` from `src/lib/validations/link.ts` (currently not exported). Or duplicate — they're small.

### Existing Link DB Functions — Reuse Completely

All CRUD functions already exist in `src/lib/db/links.ts`:
- `createLink(data)` — pass `{ slug, targetUrl, title, description, tags, expiresAt, userId }`
- `findLinkById(id, userId)` — ownership-scoped lookup
- `findLinksForLibrary({ userId, query, page, limit })` — currently page-based; for API offset-based pagination, convert: `page = Math.floor(offset / limit) + 1`, or add a new function that accepts `skip`/`take` directly
- `updateLink(id, userId, data)` — partial update with cache invalidation
- `deleteLink(id, userId)` — delete with cache invalidation

For `GET /api/v1/links` with offset-based pagination, either:
1. Add a new `findLinksWithOffset({ userId, query, sortBy, limit, offset })` function to `links.ts`, or
2. Convert offset to page in the route handler: `page = Math.floor(offset / limit) + 1`

Option 1 is cleaner for the API. The function should use Prisma's `skip` and `take`.

### Route Modifications

**`src/app/api/v1/links/route.ts`** — Modify existing handlers:

```typescript
// Replace the auth block at the top of GET and POST:
// Before:
const session = await auth();
const userId = session?.user?.id;
if (!userId) { return 401; }

// After:
const userId = await resolveUserId(request);
if (!userId) { return 401; }
```

For GET, add API-style query param support alongside existing page-based params:
- If `offset` param is present → use API offset-based pagination
- If `page` param is present → use existing page-based pagination
- This maintains backward compatibility for the frontend

For POST, handle both `customSlug` (frontend) and `slug` (API) field names:
- Try `apiCreateLinkSchema.safeParse()` first if no `customSlug` field, or
- Normalize the input: if `slug` is present and `customSlug` is not, map `slug → customSlug`

**`src/app/api/v1/links/[id]/route.ts`** — Add GET handler + dual-auth:

```typescript
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(request);
  if (!userId) { return 401; }

  const { id } = await context.params;
  const link = await findLinkById(id, userId);
  if (!link) { return 404; }

  return NextResponse.json(successResponse(toLinkResponse(link)));
}
```

### Response Format

All responses must use the established `{ data }` / `{ error }` wrapper:

```json
// Success (single): { "data": { "id": "...", "slug": "...", ... } }
// Success (list):   { "data": [...], "pagination": { "total": 42, "limit": 20, "offset": 0 } }
// Error:            { "error": { "code": "UNAUTHORIZED", "message": "..." } }
```

HTTP status codes: 200 (ok), 201 (created), 204 (deleted), 400 (validation), 401 (unauth), 404 (not found), 409 (slug conflict).

### Project Structure Notes

All file locations follow the architecture document:
- `src/lib/auth/api-key-middleware.ts` — new file, sits next to `api-key.ts` [Source: architecture.md, API Key Auth section]
- `src/lib/validations/api-link.ts` — new file, sits next to `link.ts` in validations directory
- `src/app/api/v1/links/route.ts` — existing file, modified for dual-auth [Source: architecture.md, REST API file structure]
- `src/app/api/v1/links/[id]/route.ts` — existing file, add GET + dual-auth [Source: architecture.md, REST API file structure]

No new directories needed. No new dependencies needed.

### Testing Standards

- Use Vitest with `// @vitest-environment node`
- Follow the established mocking pattern from `src/app/api/v1/links/route.test.ts` and `src/app/api/v1/user/api-keys/route.test.ts`
- Mock `@/lib/auth/config` → `auth`, mock `@/lib/auth/api-key-middleware` → `authenticateApiKey`
- Test matrix for each endpoint:
  - No auth header → 401
  - Invalid API key → 401
  - Valid API key → success
  - Valid session → success (backward compat)
  - Ownership enforcement (accessing other user's links → 404)
  - Zod validation failures → 400 with field errors
  - Happy path responses with correct status codes and shapes
- Co-locate tests: `route.test.ts` next to `route.ts`
- Current baseline: 434 tests passed, 9 skipped — must not regress

### Security Considerations

- Raw API keys MUST NOT be logged — only log `apiKeyId` and `keyPrefix`
- `keyHash` is NEVER included in any API response
- All queries enforce `userId` ownership — no cross-user access paths
- `lastUsedAt` update is fire-and-forget to avoid blocking the API response
- Invalid UUID params should return 404 (not 500) — handle Prisma validation errors

### References

- [Source: epics.md, Story 7.2 — acceptance criteria and BDD scenarios]
- [Source: architecture.md, "API Key Auth: Custom implementation" — SHA-256 hashing, Bearer token pattern]
- [Source: architecture.md, "API Style: RESTful via Next.js Route Handlers" — route pattern]
- [Source: architecture.md, "API Naming Conventions" — plural nouns, kebab-case, PATCH not PUT]
- [Source: architecture.md, "Format Patterns" — response wrappers, pagination, status codes]
- [Source: architecture.md, "API Boundaries" — thin route handlers, logic in lib/db]
- [Source: architecture.md, "Authentication & Security" — ownership-based authorization, NFR13]
- [Source: prd.md, FR34 — Links REST API requirement]
- [Source: prd.md, NFR2 — < 200ms p95 API response time]
- [Source: prd.md, NFR11 — Zod validation on all inputs]
- [Source: prd.md, NFR13 — ownership-based access control]

### Previous Story Intelligence (7.1)

Story 7.1 established the API key infrastructure:
- `ApiKey` Prisma model with `keyHash` indexed for O(1) lookup
- `findApiKeyByHash(keyHash)` in `src/lib/db/api-keys.ts` — returns `{ id, userId, keyHash }` for auth use
- `hashApiKey(rawKey)` in `src/lib/auth/api-key.ts` — SHA-256 hashing
- Test baseline: 434 passed, 9 skipped; `npm run lint` passed
- Code review added `findApiKeyByHash()` specifically for this story's auth needs
- Migration note: `npx prisma migrate dev` was blocked by Supabase auth/public drift; manual SQL migrations were used
- Agent model used: openai/gpt-5.4; reviewer: claude-opus-4-6

### Git Intelligence

Recent commit pattern: `[BMAD Phase 4] Story X.Y: Description`
- Last commit: `[BMAD Phase 4] Story 7.1: API Key Generation and Management`
- All API key infrastructure is in place and tested
- 434+ passing tests; codebase is stable
- Follow the same commit message pattern for this story

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
