# Story 2.7: Redirect Engine with Redis Caching

Status: done

## Story

As anyone with a short link URL,
I want to be redirected to the target destination instantly,
so that the short link is seamless and fast.

## Acceptance Criteria

1. **Given** a valid short link slug exists, **When** a request hits `/{slug}`, **Then** the middleware checks Redis for `slug:{slug}` → `{targetUrl, linkId, expiresAt}`. On cache HIT: returns a 301 redirect to the target URL. On cache MISS: queries PostgreSQL via `findLinkBySlug()`, populates Redis cache, then returns 301 redirect.

2. **Given** the slug does not exist in cache or database, **When** a request hits `/{slug}`, **Then** the request passes through to Next.js routing (404 page or other matched route).

3. **Given** a link exists but has expired (`expiresAt` < now), **When** a request hits `/{slug}`, **Then** the redirect is NOT performed — the request passes through to an "expired" page instead.

4. **Given** a link target URL is updated via `PATCH /api/v1/links/[id]`, **When** the update succeeds, **Then** the Redis cache for that slug is invalidated so the next redirect serves the new target.

5. **Given** a link is deleted via `DELETE /api/v1/links/[id]`, **When** the delete succeeds, **Then** the Redis cache for that slug is invalidated so the slug returns 404.

6. **Given** the redirect engine handles a request, **Then** redirect responses never block on analytics writes (NFR6). Analytics capture is deferred — a no-op stub or `waitUntil()` placeholder is acceptable since analytics are built in Epic 6.

7. **Given** the redirect engine is deployed, **Then** redirect latency is < 50ms at p99 for cache hits (NFR1), and the engine operates statelessly for horizontal scaling (NFR16).

## Tasks / Subtasks

- [x] Install Redis client and create cache module (AC: #1, #7)
  - [x] Add `ioredis` package to dependencies (`npm install ioredis` + `npm install -D @types/ioredis`)
  - [x] Create `src/lib/cache/client.ts` — Redis client singleton (connect via `REDIS_URL` from env)
  - [x] Add `REDIS_URL` to `src/config/env.ts` Zod validation (optional string, default `redis://localhost:6379`)
  - [x] Create `src/lib/cache/redirect.ts` — `getRedirectCache(slug)`, `setRedirectCache(slug, data)` functions
  - [x] Create `src/lib/cache/redirect.test.ts` — unit tests with mocked Redis client

- [x] Create cache invalidation module (AC: #4, #5)
  - [x] Create `src/lib/cache/invalidation.ts` — `invalidateRedirectCache(slug: string)` function
  - [x] Create `src/lib/cache/invalidation.test.ts` — tests for invalidation

- [x] Extend middleware for redirect resolution (AC: #1, #2, #3, #6, #7)
  - [x] Update `src/middleware.ts` to add redirect resolution logic before auth checks
  - [x] Add `/{slug}` pattern matching to middleware config matcher (catch-all for single-segment paths, excluding reserved prefixes: `api`, `_next`, `login`, `register`, `dashboard`, `settings`, `b`)
  - [x] On slug match: check Redis → fallback to DB → populate cache on miss → return 301 redirect
  - [x] Handle expired links: check `expiresAt`, pass through to Next.js if expired
  - [x] Handle non-existent slugs: pass through to Next.js routing (404)
  - [x] Add analytics stub: comment/no-op placeholder for future `waitUntil()` analytics capture (Epic 6)

- [x] Integrate cache invalidation into existing link mutation endpoints (AC: #4, #5)
  - [x] Update `src/lib/db/links.ts` `updateLink()` — call `invalidateRedirectCache(slug)` after successful update
  - [x] Update `src/lib/db/links.ts` `deleteLink()` — call `invalidateRedirectCache(slug)` after successful delete
  - [x] Update `src/lib/db/links.ts` `createLink()` — optionally pre-warm cache on creation (nice-to-have, not required)

- [x] Create expired link page (AC: #3)
  - [x] Create `src/app/expired/page.tsx` — simple "This link has expired" page
  - [x] Middleware redirects expired slug hits to `/expired` (or renders inline)

- [x] Write comprehensive tests (AC: all)
  - [x] Middleware redirect tests (cache hit, cache miss + DB hit, expired link, non-existent slug, reserved path passthrough)
  - [x] Cache module tests (get/set/invalidate with mocked Redis)
  - [x] Integration: verify `updateLink()` and `deleteLink()` now call cache invalidation
  - [x] Regression: all existing Story 2.1–2.6 tests must continue passing

## Dev Notes

### Architecture Compliance

- **Middleware-first redirect** — Redirect resolution happens in `src/middleware.ts` BEFORE Next.js routing. This is the hot path. [Source: architecture.md lines 697-706]
- **Cache-aside pattern** — Check Redis first, fall back to PostgreSQL on miss, populate cache on miss, invalidate on mutation. [Source: architecture.md lines 151-153]
- **Cache key format** — `slug:{slug}` → JSON `{targetUrl, linkId, expiresAt}`. [Source: architecture.md line 154]
- **Cache module boundary** — `lib/cache/*` is the ONLY code that imports the Redis client directly. Route handlers and middleware call cache helper functions, never Redis directly. [Source: architecture.md line 644]
- **Structured logging** — Use `logger` from `src/lib/logger.ts`, never `console.log`. [Source: architecture.md line 455]
- **NFR13** — Redirect is a public operation (no auth check needed). Any slug that exists and is not expired gets redirected. [Source: prd.md FR7]
- **301 redirect** — Use 301 (permanent redirect) for short link resolution. [Source: epics.md Story 2.7 AC]
- **Stateless** — No in-process state for redirects. All state lives in Redis/PostgreSQL. [Source: architecture.md NFR16]

### Technical Requirements

- **Redis client**: Use `ioredis` (not `@upstash/redis`). Next.js 16 middleware runs on Node.js runtime, so `ioredis` TCP connections work. The project targets VPS/Docker deployment where a self-hosted Redis instance is available. [Source: architecture.md lines 256-257]
- **Redis client singleton**: Create in `src/lib/cache/client.ts`. Connect using `REDIS_URL` env var (already in `.env.example`). Handle connection errors gracefully — if Redis is down, fall back to DB-only mode (degraded performance, not an outage).
- **Cache TTL**: Set a TTL on cached entries (e.g., 24h / 86400s). This prevents stale data from lingering if invalidation fails. The architecture does not specify a TTL — use a sensible default.
- **Middleware config**: Next.js 16 middleware matcher must explicitly include the slug catch-all pattern while excluding reserved paths. Current matcher is `["/dashboard/:path*", "/login"]`. Expand to also catch single-segment paths that could be slugs.
- **Edge vs Node.js runtime**: Next.js 16.1.6 middleware supports Node.js runtime by default. Do NOT add `export const runtime = 'edge'` — the default Node.js runtime is correct for `ioredis` compatibility.
- **`waitUntil()` for analytics**: The architecture specifies using `waitUntil()` to fire analytics events after the redirect response. Since analytics capture is not built until Epic 6, add a comment placeholder: `// TODO(Epic 6): waitUntil(captureClickEvent(linkId, request))`. Do NOT build analytics infrastructure in this story.
- **Expired link detection**: Check `expiresAt` field. If `expiresAt !== null && new Date(expiresAt) < new Date()`, the link is expired. This check must happen in both Redis cache and DB fallback paths.

### Existing Code to Reuse

- **`findLinkBySlug(slug: string)`** in `src/lib/db/links.ts` — Already exists. Returns `{ id, slug, targetUrl, expiresAt, ... }` or `null`. Use this for the DB fallback path. Do NOT create a new query function.
- **`src/middleware.ts`** — Already exists with auth redirect logic using `getToken()`. Extend this file, don't replace it. Add redirect resolution BEFORE the auth checks (redirects are unauthenticated and must be fast).
- **`src/lib/logger.ts`** — Structured JSON logger. Use for redirect logging: `logger.info("redirect.cache_hit", { slug })`, `logger.info("redirect.cache_miss", { slug })`, `logger.warn("redirect.expired", { slug })`.
- **`src/config/env.ts`** — Zod-validated environment. Add `REDIS_URL` here.
- **`src/lib/errors.ts`** — `AppError` class. Not needed for redirect flow (redirects don't return JSON error bodies), but available if needed.

### Scope Boundaries

**IN scope for this story:**
- `ioredis` package installation and Redis client singleton
- Cache module: `src/lib/cache/client.ts`, `src/lib/cache/redirect.ts`, `src/lib/cache/invalidation.ts`
- Middleware extension for redirect resolution (cache → DB fallback → 301)
- Expired link handling (pass-through to expired page)
- Cache invalidation wired into `updateLink()` and `deleteLink()`
- Expired link page (`src/app/expired/page.tsx`)
- Tests for all new modules

**OUT of scope — do NOT implement:**
- Analytics event capture on redirect (Epic 6 — Story 6.1)
- Rate limiting on redirect endpoint (Epic 7 — Story 7.5)
- Custom domain support (Phase 2)
- Link click counting (Epic 6)
- Redis-backed rate limiting (separate from in-memory rate limit in `src/lib/rate-limit.ts`)
- Cache warming on application startup
- Redis Cluster or Sentinel configuration
- Monitoring/alerting for cache hit ratio
- Public board routing (`/b/{slug}` — Epic 5)

### File / Technical Scope

Files to **create**:
- `src/lib/cache/client.ts` — Redis client singleton (ioredis)
- `src/lib/cache/redirect.ts` — `getRedirectCache()`, `setRedirectCache()` functions
- `src/lib/cache/redirect.test.ts` — Cache module unit tests
- `src/lib/cache/invalidation.ts` — `invalidateRedirectCache()` function
- `src/lib/cache/invalidation.test.ts` — Invalidation unit tests
- `src/app/expired/page.tsx` — "Link has expired" page

Files to **modify**:
- `src/middleware.ts` — Add redirect resolution logic + expand matcher config
- `src/lib/db/links.ts` — Wire cache invalidation into `updateLink()` and `deleteLink()`
- `src/config/env.ts` — Add `REDIS_URL` env var validation
- `package.json` — Add `ioredis` dependency

Files to **NOT modify**:
- `src/app/api/v1/links/[id]/route.ts` — Do NOT add cache invalidation here. Keep it in the data access layer (`lib/db/links.ts`) so all mutation paths are covered.
- `prisma/schema.prisma` — No schema changes needed. Link model already has `slug` (unique, indexed) and `expiresAt`.
- `src/lib/rate-limit.ts` — Leave existing in-memory rate limiter alone. It serves auth endpoints and is unrelated.

### Testing Requirements

- **Cache module tests** (`src/lib/cache/redirect.test.ts`): Mock `ioredis` client. Test `getRedirectCache` returns cached data or null. Test `setRedirectCache` stores with correct key format and TTL. Test graceful handling when Redis throws (returns null, doesn't crash).
- **Invalidation tests** (`src/lib/cache/invalidation.test.ts`): Mock Redis. Test `invalidateRedirectCache` calls `DEL slug:{slug}`. Test graceful handling when Redis throws (logs warning, doesn't crash).
- **Middleware redirect tests**: Test cache hit returns 301 with correct Location header. Test cache miss triggers DB lookup and populates cache. Test expired link passes through (no redirect). Test non-existent slug passes through. Test reserved paths (`/api/*`, `/dashboard/*`, `/login`, `/_next/*`) are NOT intercepted. Test links without expiration always redirect.
- **Integration tests for cache invalidation**: Mock Redis in `links.ts` tests. Verify `updateLink()` calls `invalidateRedirectCache`. Verify `deleteLink()` calls `invalidateRedirectCache`. Existing link tests must still pass.
- **Regression**: All existing Story 2.1–2.6 tests (190 passed, 8 skipped) must continue passing.

### Anti-Patterns to Avoid

- Do NOT use `@upstash/redis` — the project targets VPS/Docker with self-hosted Redis, not Upstash serverless. Use `ioredis`.
- Do NOT add `export const runtime = 'edge'` to middleware — Next.js 16 defaults to Node.js runtime, which `ioredis` requires.
- Do NOT call Redis directly from middleware or route handlers — always go through `lib/cache/*` functions.
- Do NOT build analytics capture — that's Epic 6. Add a TODO comment only.
- Do NOT block the redirect response on anything other than the cache/DB lookup. The 301 must return as fast as possible.
- Do NOT create a separate `src/app/[slug]/route.ts` catch-all route — the architecture specifies middleware-based redirect resolution, not a route handler. Middleware is faster because it runs before routing.
- Do NOT import Prisma client directly in cache modules — `lib/cache/*` only knows about Redis. DB lookups go through `lib/db/links.ts`.
- Do NOT hardcode the Redis URL — read from `REDIS_URL` env var via `src/config/env.ts`.
- Do NOT throw errors from cache operations — Redis failures should degrade to DB-only mode, not crash the request. Wrap all Redis calls in try/catch with `logger.warn`.
- Do NOT use `302` (temporary redirect) — use `301` (permanent redirect) as specified in the acceptance criteria.
- Do NOT duplicate the `findLinkBySlug` logic — import and use the existing function from `src/lib/db/links.ts`.

### Previous-Story Intelligence

- **Story 2.6** completed with 190 tests passing, 8 skipped (DB integration tests — no local DB).
- **Story 2.6** `deleteLink()` in `src/lib/db/links.ts` (lines 46-58): calls `findLinkById()` for ownership check, then `prisma.link.delete()`. You need to add cache invalidation AFTER the delete succeeds. The slug is available from the `findLinkById()` result — you'll need to capture it before delete.
- **Story 2.5** `updateLink()` in `src/lib/db/links.ts`: similar pattern — calls `findLinkById()` then `prisma.link.update()`. Add cache invalidation after update. The slug is available from the `findLinkById()` result.
- **Story 2.4** added `expiresAt` to the Link model. The expiration check logic in this story must be consistent with Story 2.4's expired link behavior.
- **Story 2.6** dev notes explicitly state: "No Redis cache invalidation — Redis caching is not yet implemented (Story 2.7). Do NOT add Redis code." — This story IS Story 2.7, so now you add it.
- **Code review note from 2.6**: TOCTOU race in `deleteLink` (findLinkById + delete) — known issue, not blocking. Same pattern applies to cache invalidation: invalidate after confirmed delete, accept the race window.
- **Agent model used**: Previous stories used `openai/gpt-5.4`. Code conventions are well-established: `verbNoun` function naming, co-located tests, describe/it test blocks, logger key format `"module.action"`.

### Git Intelligence

Recent commits follow `[BMAD Phase 4] Story X.Y: Description` pattern. Key conventions from git history:
- Functions: `createLink`, `findLinkBySlug`, `updateLink`, `deleteLink` → add `getRedirectCache`, `setRedirectCache`, `invalidateRedirectCache`
- Test describe blocks follow function or route naming
- Single commit per story with all files
- 190 tests currently passing

### Project Structure Notes

```
src/lib/cache/           # NEW directory — create this
  client.ts              # Redis client singleton
  redirect.ts            # getRedirectCache, setRedirectCache
  redirect.test.ts       # Cache tests
  invalidation.ts        # invalidateRedirectCache
  invalidation.test.ts   # Invalidation tests

src/middleware.ts         # MODIFY — add redirect resolution
src/lib/db/links.ts      # MODIFY — wire cache invalidation
src/config/env.ts        # MODIFY — add REDIS_URL
src/app/expired/page.tsx  # NEW — expired link page
```

Alignment with architecture.md directory structure (lines 599-603): matches exactly.

### Middleware Implementation Guidance

The existing `src/middleware.ts` structure:
```typescript
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Currently: auth redirect logic for /dashboard and /login
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
```

**Required changes:**
1. Add slug detection BEFORE auth logic (redirects are faster and more frequent)
2. Expand matcher to include `/:path` (single-segment paths)
3. Use a reserved-prefix check to skip non-slug paths
4. Call `getRedirectCache(slug)` → on hit, check expiry, return 301
5. On cache miss, call `findLinkBySlug(slug)` → on hit, populate cache, return 301
6. On no match (null from both), fall through to `NextResponse.next()` for normal routing

**Reserved path prefixes** (do NOT treat as slugs):
`api`, `_next`, `dashboard`, `login`, `register`, `settings`, `expired`, `b`, `favicon.ico`, `robots.txt`, `sitemap.xml`

### Redis Cache Data Structure

```typescript
// Key: `slug:${slug}`
// Value: JSON string of:
interface RedirectCacheEntry {
  targetUrl: string;
  linkId: string;
  expiresAt: string | null; // ISO 8601 or null
}

// TTL: 86400 seconds (24 hours)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.7: Redirect Engine with Redis Caching]
- [Source: _bmad-output/planning-artifacts/architecture.md lines 151-154 — Redis cache-aside pattern, cache key format]
- [Source: _bmad-output/planning-artifacts/architecture.md lines 697-706 — Redirect data flow]
- [Source: _bmad-output/planning-artifacts/architecture.md lines 599-603 — Cache module directory structure]
- [Source: _bmad-output/planning-artifacts/architecture.md line 644 — Cache module boundary rule]
- [Source: _bmad-output/planning-artifacts/architecture.md lines 233-234 — Middleware handles redirect at edge]
- [Source: _bmad-output/planning-artifacts/architecture.md lines 206-209 — waitUntil() for async analytics]
- [Source: _bmad-output/planning-artifacts/architecture.md lines 256-257 — Upstash vs self-hosted Redis]
- [Source: _bmad-output/planning-artifacts/prd.md FR7 — Anyone with short link URL redirected to target]
- [Source: _bmad-output/planning-artifacts/prd.md NFR1 — < 50ms p99 redirect latency]
- [Source: _bmad-output/planning-artifacts/prd.md NFR6 — Analytics writes never block redirects]
- [Source: _bmad-output/planning-artifacts/prd.md NFR16 — Redirect engine scales horizontally]
- [Source: _bmad-output/implementation-artifacts/2-6-delete-links.md — Previous story patterns and test count]
- [Source: prisma/schema.prisma — Link model with slug (unique, indexed) and expiresAt]

## Dev Agent Record

### Agent Model Used

- openai/gpt-5.4

### Debug Log References

- `npm test -- src/lib/cache/redirect.test.ts src/lib/cache/invalidation.test.ts src/lib/db/links.cache.test.ts src/middleware.test.ts`
- `npm run lint && npm test`

### Completion Notes List

- Added Redis cache boundary in `src/lib/cache/client.ts`, `src/lib/cache/redirect.ts`, and `src/lib/cache/invalidation.ts` with graceful degradation/logging and `slug:{slug}` cache key + 24h TTL.
- Extended `src/middleware.ts` with single-segment slug detection before auth checks, Redis cache-aside redirect resolution, expired-link redirect to `/expired`, reserved-path passthrough, and Epic 6 analytics TODO stubs.
- Wired `invalidateRedirectCache()` into `updateLink()` and `deleteLink()` in `src/lib/db/links.ts`; left `createLink()` cache pre-warm out-of-scope.
- Added `REDIS_URL` defaulted env validation in `src/config/env.ts`, added Redis deps in `package.json` / `package-lock.json`, and created `src/app/expired/page.tsx`.
- Added unit/integration coverage in `src/lib/cache/redirect.test.ts`, `src/lib/cache/invalidation.test.ts`, `src/lib/db/links.cache.test.ts`, and `src/middleware.test.ts`; full suite passed at 207 passed, 8 skipped; eslint passed.

### File List

- package.json
- package-lock.json
- src/config/env.ts
- src/lib/cache/client.ts
- src/lib/cache/redirect.ts
- src/lib/cache/redirect.test.ts
- src/lib/cache/invalidation.ts
- src/lib/cache/invalidation.test.ts
- src/lib/db/links.ts
- src/lib/db/links.cache.test.ts
- src/middleware.ts
- src/middleware.test.ts
- src/app/expired/page.tsx


## Change Log

- 2026-03-18: Implemented Story 2.7 Redis-backed middleware redirects, expired-link handling, cache invalidation hooks, and regression coverage.