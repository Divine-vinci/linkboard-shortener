# Story 7.5: API Rate Limiting

Status: done

## Story

As the system,
I want to enforce rate limiting on API endpoints,
so that no single consumer can overwhelm the service.

## Acceptance Criteria

1. **API key rate limiting returns 429 with retry metadata**
   - Given an API consumer is making requests with a valid API key
   - When they exceed the configured rate limit (for example, 100 requests per minute per key)
   - Then subsequent requests receive `429 { error: { code: "RATE_LIMITED", message: "Too many requests", details: { retryAfter: seconds } } }`
   - And the `Retry-After` header is set (FR38)

2. **Session-authenticated dashboard API requests are also protected**
   - Given an authenticated dashboard user calls `/api/v1/*` without an API key
   - When they exceed the configured request limit for their identity
   - Then the request is rejected with the same `429` response contract

3. **Distributed enforcement uses Redis when available**
   - Given rate limiting is configured with Redis backing
   - When multiple application instances are running
   - Then limits are enforced consistently across instances
   - And the implementation falls back safely to in-memory limiting in local/dev environments

4. **Rate limiting integrates with existing API auth flow**
   - Given an API route already uses `resolveUserId(request)`
   - When the route executes
   - Then rate limiting is enforced before expensive database work
   - And ownership / validation behavior from prior stories remains unchanged

5. **Configuration is centralized and test-covered**
   - Given the project needs different limits for auth endpoints vs general API endpoints
   - Then the rate-limit logic is implemented in shared library code with clear helpers
   - And tests cover allowed requests, limited requests, retry-after behavior, identity separation, and fallback behavior

## Tasks / Subtasks

- [x] Task 1: Expand shared rate limiting utilities for API use (AC: #1, #2, #3, #5)
  - [x] 1.1 Refactor `src/lib/rate-limit.ts` to support generic consume/check helpers instead of auth-only failure tracking
  - [x] 1.2 Add a reusable rate-limit result shape with `limited`, `remaining`, and `retryAfter`
  - [x] 1.3 Add API-identity key helpers for API key IDs and session/user IDs
  - [x] 1.4 Preserve existing auth-login behavior while reusing the shared primitives
  - [x] 1.5 If Redis configuration is available, use Redis-backed counters; otherwise fall back to in-memory counters for local development

- [x] Task 2: Add an API route guard/middleware helper (AC: #1, #2, #4)
  - [x] 2.1 Create a helper that can be called at the top of `/api/v1/*` handlers after identity resolution
  - [x] 2.2 Return a standardized 429 response with `Retry-After` header when limited
  - [x] 2.3 Avoid duplicating rate-limit response code across every route

- [x] Task 3: Apply rate limiting to Link endpoints (AC: #1, #2, #4)
  - [x] 3.1 Update `src/app/api/v1/links/route.ts`
  - [x] 3.2 Update `src/app/api/v1/links/[id]/route.ts`

- [x] Task 4: Apply rate limiting to Board endpoints (AC: #1, #2, #4)
  - [x] 4.1 Update `src/app/api/v1/boards/route.ts`
  - [x] 4.2 Update `src/app/api/v1/boards/[id]/route.ts`
  - [x] 4.3 Update `src/app/api/v1/boards/[id]/links/route.ts`

- [x] Task 5: Apply rate limiting to Analytics endpoints (AC: #1, #2, #4)
  - [x] 5.1 Update `src/app/api/v1/analytics/links/[id]/route.ts`
  - [x] 5.2 Update `src/app/api/v1/analytics/boards/[id]/route.ts`

- [x] Task 6: Apply rate limiting to API key management and profile endpoints as appropriate (AC: #2, #4)
  - [x] 6.1 Update `src/app/api/v1/user/api-keys/route.ts`
  - [x] 6.2 Update `src/app/api/v1/user/api-keys/[id]/route.ts`
  - [x] 6.3 Update `src/app/api/v1/user/profile/route.ts`

- [x] Task 7: Add/extend tests (AC: #1, #2, #3, #5)
  - [x] 7.1 Add focused unit tests for `src/lib/rate-limit.ts`
  - [x] 7.2 Add route tests proving 429 + `Retry-After` on representative endpoints
  - [x] 7.3 Verify one identity hitting a limit does not affect another identity
  - [x] 7.4 Verify existing auth rate-limit tests still pass

- [x] Task 8: Validate end-to-end quality
  - [x] 8.1 Run targeted API tests
  - [x] 8.2 Run full test suite / lint / typecheck

## Dev Notes

### Key Implementation Pattern

Use the same existing auth-first route structure from Stories 7.1–7.4:
1. Resolve caller identity (`resolveUserId(request)`)
2. Enforce rate limit using shared helper(s)
3. Return standardized 429 response if limited
4. Continue with existing validation and DB logic

Keep route handlers thin. Shared logic belongs in `src/lib/rate-limit.ts` (and a small helper if needed), not duplicated per route.

### Existing Files to Reuse

| File | What to reuse |
|------|---------------|
| `src/lib/rate-limit.ts` | Existing in-memory auth limiting utilities; extend instead of replacing route-by-route |
| `src/lib/auth/api-key-middleware.ts` | Existing API key/session identity resolution |
| `src/lib/api-response.ts` | Standard success/error response helpers |
| `src/lib/errors.ts` | `AppError` with `RATE_LIMITED` support |
| `src/lib/logger.ts` | Structured logs for unexpected failures |

### Files Likely to Change

| File | Purpose |
|------|---------|
| `src/lib/rate-limit.ts` | Shared generic rate-limit engine + fallback strategy |
| `src/app/api/v1/links/route.ts` | Apply API rate limiting |
| `src/app/api/v1/links/[id]/route.ts` | Apply API rate limiting |
| `src/app/api/v1/boards/route.ts` | Apply API rate limiting |
| `src/app/api/v1/boards/[id]/route.ts` | Apply API rate limiting |
| `src/app/api/v1/boards/[id]/links/route.ts` | Apply API rate limiting |
| `src/app/api/v1/analytics/links/[id]/route.ts` | Apply API rate limiting |
| `src/app/api/v1/analytics/boards/[id]/route.ts` | Apply API rate limiting |
| `src/app/api/v1/user/api-keys/route.ts` | Apply API rate limiting |
| `src/app/api/v1/user/api-keys/[id]/route.ts` | Apply API rate limiting |
| `src/app/api/v1/user/profile/route.ts` | Apply API rate limiting |
| `src/lib/rate-limit.test.ts` | Add shared helper coverage |

### Suggested Configuration

- Default API limit: start with `100 requests / minute / identity`
- Identity priority:
  1. API key identity when authenticated by API key
  2. Session user identity when authenticated by session
  3. Preserve existing IP-based auth throttling for login/password-reset flows
- Redis backing should be optional by environment so local tests/dev stay simple

### Response Contract

When limited, return:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "details": {
      "retryAfter": 42
    }
  }
}
```

And set header:

```http
Retry-After: 42
```

### Implementation Guardrails

- Do not change ownership checks or existing success payloads
- Do not move business logic into route handlers
- Avoid per-route duplicated limit constants unless there is a clear product reason
- Keep auth endpoint limiting behavior intact while generalizing the shared library

## Dev Agent Record

### File List

| File | Change |
|------|--------|
| `src/lib/rate-limit.ts` | Added `RateLimitStatus`, `RateLimitResult`, `RateLimitConfig` types; `consumeRateLimit` with Redis-first/memory-fallback; `enforceApiRateLimit` helper returning 429 NextResponse; atomic Lua script for Redis incr+expire |
| `src/lib/rate-limit.test.ts` | New file: 4 unit tests covering consume limits, identity isolation, Redis fallback, and 429 response contract |
| `src/lib/auth/api-key-middleware.ts` | Added `ApiRequestIdentity` type with `rateLimitKey`; added `resolveApiRequestIdentity` and `resolveSessionApiIdentity` helpers |
| `src/app/api/v1/links/route.ts` | Added `enforceApiRateLimit` after identity resolution in GET/POST |
| `src/app/api/v1/links/[id]/route.ts` | Added `enforceApiRateLimit` after identity resolution in GET/PATCH/DELETE |
| `src/app/api/v1/boards/route.ts` | Added `enforceApiRateLimit` after identity resolution in GET/POST |
| `src/app/api/v1/boards/[id]/route.ts` | Added `enforceApiRateLimit` after identity resolution in GET/PATCH/DELETE |
| `src/app/api/v1/boards/[id]/links/route.ts` | Migrated from `resolveUserId` to `resolveApiRequestIdentity`; added `enforceApiRateLimit` |
| `src/app/api/v1/analytics/links/[id]/route.ts` | Added `enforceApiRateLimit` after identity resolution in GET |
| `src/app/api/v1/analytics/boards/[id]/route.ts` | Added `enforceApiRateLimit` after identity resolution in GET |
| `src/app/api/v1/user/api-keys/route.ts` | Added `enforceApiRateLimit` after session identity resolution in GET/POST |
| `src/app/api/v1/user/api-keys/[id]/route.ts` | Added `enforceApiRateLimit` after session identity resolution in DELETE |
| `src/app/api/v1/user/profile/route.ts` | Added `enforceApiRateLimit` after session identity resolution in GET/PATCH |
| `src/app/api/v1/links/route.test.ts` | Added 429 rate limit test with retry metadata |
| `src/app/api/v1/links/[id]/route.test.ts` | Added `__resetRateLimitStore` to `beforeEach` |
| `src/app/api/v1/boards/route.test.ts` | Added `__resetRateLimitStore` to `beforeEach` |
| `src/app/api/v1/boards/[id]/route.test.ts` | Added `__resetRateLimitStore` to `beforeEach` |
| `src/app/api/v1/boards/[id]/links/route.test.ts` | Updated mock from `resolveUserId` to `resolveApiRequestIdentity`; added `__resetRateLimitStore` |
| `src/app/api/v1/analytics/links/[id]/route.test.ts` | Added `__resetRateLimitStore` to `beforeEach` |
| `src/app/api/v1/analytics/boards/[id]/route.test.ts` | Added `__resetRateLimitStore` to `beforeEach` |
| `src/app/api/v1/user/profile/route.test.ts` | Added 429 rate limit test for session-authenticated endpoints |

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-19 | Initial implementation of all tasks | Dev Agent |
| 2026-03-19 | Code review fixes: Task 4.3 board-links rate limiting, Redis atomicity, test store resets, story documentation | Review Agent |
