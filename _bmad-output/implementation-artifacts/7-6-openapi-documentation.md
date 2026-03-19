# Story 7.6: OpenAPI Documentation

Status: done

## Story

As an API consumer,
I want to access interactive API documentation,
so that I can understand and test all available endpoints.

## Acceptance Criteria

1. Navigating to `/api/docs` renders a Swagger UI displaying all `/api/v1/*` endpoints with request/response schemas
2. Schemas are auto-generated from the Zod validation schemas used in route handlers (no manual OpenAPI YAML/JSON)
3. Endpoints are testable directly from the documentation interface (Try It Out)
4. Authentication requirements are documented (API key via `Authorization: Bearer <key>`)
5. Rate limiting responses (429) are documented for all protected endpoints
6. All response formats match the project's `{ data }` / `{ error }` wrapper pattern
7. Endpoint grouping: Links, Boards, Board Links, Analytics, User/API Keys, Auth

## Tasks / Subtasks

- [x] Task 1: Install and configure OpenAPI generation + Swagger UI dependencies/approach (AC: #2, #3)
  - [x] 1.1 Implemented OpenAPI generation without extra schema deps by using Zod 4 JSON Schema export and served Swagger UI via CDN assets
  - [x] 1.2 Chose a lighter route-handler-based Swagger UI integration instead of adding a Next-specific wrapper
- [x] Task 2: Create OpenAPI spec generation from existing Zod schemas (AC: #2, #6)
  - [x] 2.1 Created `src/lib/openapi/registry.ts` with reusable schema metadata + shared response wrappers
  - [x] 2.2 Defined path operations programmatically inside the generator for all current API groups
  - [x] 2.3 Created `src/lib/openapi/generator.ts` to assemble the OpenAPI 3.1 spec document
  - [x] 2.4 Included `{ data }` success wrappers and `{ error }` response schemas throughout the generated spec
- [x] Task 3: Define all API path operations (AC: #1, #4, #5, #7)
  - [x] 3.1 Documented Links endpoints
  - [x] 3.2 Documented Boards endpoints
  - [x] 3.3 Documented Board Links endpoints
  - [x] 3.4 Documented Analytics endpoints
  - [x] 3.5 Documented User/API key endpoints
  - [x] 3.6 Documented Auth endpoints
  - [x] 3.7 Documented 429 rate limit responses on protected endpoints
  - [x] 3.8 Documented the Bearer token security scheme
- [x] Task 4: Create Swagger UI route handler (AC: #1, #3)
  - [x] 4.1 Added `src/app/api/docs/openapi.json/route.ts` to serve the generated spec at `GET /api/docs/openapi.json`
  - [x] 4.2 Added `src/app/api/docs/route.ts` to serve Swagger UI HTML at `GET /api/docs`
  - [x] 4.3 Configured Swagger UI to load the generated JSON spec from `/api/docs/openapi.json`
  - [x] 4.4 Configured Swagger UI with the Bearer auth security scheme exposed in the spec
- [x] Task 5: Write tests (AC: #1, #2)
  - [x] 5.1 Added a test for `GET /api/docs` returning HTML
  - [x] 5.2 Added a test validating the OpenAPI 3.1 JSON endpoint
  - [x] 5.3 Added coverage asserting all existing `/api/v1/*` routes are represented
  - [x] 5.4 Added generator coverage for schema propagation and auth/429 documentation
- [x] Task 6: Verify integration (AC: #1-#7)
  - [x] 6.1 Verified focused tests plus `npm run build`
  - [x] 6.2 Verified Swagger UI HTML includes Try It Out configuration and Bearer auth wiring for real API-key usage

## Dev Notes

### Architecture Compliance

- **Route location**: `src/app/api/docs/` per architecture spec (`app/api/v1/docs/route.ts` mentioned, but `/api/docs` is the public path per AC)
- **No business logic in route handlers** — spec generation logic goes in `src/lib/openapi/`
- **Zod 4** (v4.3.6) is installed — verify `zod-openapi` library compatibility with Zod 4 before choosing; Zod 4 changed internals significantly from Zod 3
- **OpenAPI 3.1** preferred (JSON Schema alignment)

### Existing Zod Schemas to Register

All schemas live in `src/lib/validations/`:

| File | Schemas |
|------|---------|
| `api-link.ts` | `apiCreateLinkSchema`, `apiListLinksQuerySchema`, `apiUpdateLinkSchema` |
| `board.ts` | Board create/update schemas |
| `api-key.ts` | API key create schema |
| `api-analytics.ts` | Analytics query schemas |
| `auth.ts` | Register, login, forgot-password, reset-password schemas |
| `profile.ts` | Profile update schema |
| `helpers.ts` | Shared primitive schemas |
| `link.ts` | Base link schemas (reused by `api-link.ts`) |

### Response Shapes to Document

Reuse types from `src/lib/api-response.ts`:
- `SuccessResponse<T>` = `{ data: T }`
- `ErrorResponse` = `{ error: { code: string, message: string, details?: Record<string, unknown> } }`
- `toLinkResponse()` shape: `{ id, slug, targetUrl, title, description, tags, expiresAt, userId, createdAt, updatedAt }`
- `toBoardResponse()` shape: `{ id, name, slug, description, visibility, userId, createdAt, updatedAt, _count? }`
- Pagination wrapper: `{ data: T[], pagination: { total, limit, offset } }`

### Rate Limiting Documentation

From story 7.5, all protected endpoints return 429:
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "details": { "retryAfter": 42 }
  }
}
```
Plus `Retry-After` header. Default: 100 req/min/identity.

### API Key Auth Pattern

From `src/lib/auth/api-key-middleware.ts`:
- Header: `Authorization: Bearer lb_<64-char-hex>`
- Key prefix format: `lb_` + hex string
- 401 response: `{ error: { code: "UNAUTHORIZED", message: "..." } }`

### Library Selection Guidance

**Preferred approach**: `@asteasolutions/zod-to-openapi` — mature library that creates OpenAPI registry from Zod schemas. Verify Zod 4 compatibility first (check their GitHub issues/releases).

**Alternative if Zod 4 incompatible**: Manually construct OpenAPI JSON spec using `zod-to-json-schema` for schema extraction, then build paths programmatically.

**Swagger UI serving**: Use `swagger-ui-dist` (static assets) served via a Next.js route handler returning HTML. This avoids React SSR issues with `swagger-ui-react`. The route handler can inline the CSS/JS from the dist package or reference CDN versions.

### Anti-Patterns to Avoid

- Do NOT write a manual OpenAPI YAML/JSON file — it will drift from actual schemas
- Do NOT add OpenAPI decorators/annotations to route handler files — keep route handlers thin
- Do NOT import route handler code into the spec generator — only import Zod schemas and response type definitions
- Do NOT add swagger-ui as a React component page — use a route handler serving HTML to avoid SSR/hydration issues
- Do NOT skip documenting error responses (401, 404, 429, 400, 500) — they are part of the API contract

### Project Structure Notes

New files to create:
```
src/
├── lib/
│   └── openapi/
│       ├── registry.ts      # Zod schema registration with OpenAPI metadata
│       ├── generator.ts     # Full OpenAPI spec assembly
│       └── paths/
│           ├── links.ts     # Link endpoint definitions
│           ├── boards.ts    # Board endpoint definitions
│           ├── analytics.ts # Analytics endpoint definitions
│           ├── user.ts      # User/API key endpoint definitions
│           └── auth.ts      # Auth endpoint definitions
└── app/
    └── api/
        └── docs/
            ├── route.ts     # Serves Swagger UI HTML at GET /api/docs
            └── spec/
                └── route.ts # Serves OpenAPI JSON at GET /api/docs/spec
```

Alignment: follows existing `src/lib/` for logic, `src/app/api/` for routes.

### Previous Story Intelligence

From story 7.5 (API Rate Limiting):
- All route handlers follow: resolve identity -> enforce rate limit -> validate input -> business logic -> response
- `__resetRateLimitStore` must be called in test `beforeEach` blocks
- `enforceApiRateLimit` returns `NextResponse | null`
- Redis fallback to in-memory is transparent

### Git Intelligence

Recent commits show consistent pattern: `[BMAD Phase 4] Story X.Y: Title`. All Epic 7 stories (7.1-7.5) are done. The codebase has 16 API route files across links, boards, analytics, user, and auth endpoints — all must appear in the OpenAPI spec.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 7, Story 7.6]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Documentation]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Design Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Validation]
- [Source: _bmad-output/implementation-artifacts/7-5-api-rate-limiting.md#Dev Notes]
- [Source: src/lib/validations/ — all schema files]
- [Source: src/lib/api-response.ts — response wrapper types]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List
- Added a generated OpenAPI 3.1 document at `/api/docs/openapi.json` built from existing Zod request/query schemas and shared response wrappers.
- Added Swagger UI HTML at `/api/docs` with Bearer auth support and Try It Out enabled via Swagger UI.
- Added focused tests covering docs HTML, spec JSON generation, endpoint coverage, auth docs, and 429 documentation; verified with a production build.


### Change Log
- 2026-03-19: Implemented OpenAPI spec generation, docs routes, and verification coverage; finalized via heartbeat recovery after stalled workflow handoff.


### File List
- src/lib/openapi/registry.ts
- src/lib/openapi/generator.ts
- src/lib/openapi/generator.test.ts
- src/app/api/docs/route.ts
- src/app/api/docs/route.test.ts
- src/app/api/docs/openapi.json/route.ts
- src/app/api/docs/openapi.json/route.test.ts

