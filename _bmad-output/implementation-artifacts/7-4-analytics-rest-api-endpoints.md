# Story 7.4: Analytics REST API Endpoints

Status: done

## Story

As an API consumer,
I want to retrieve analytics data via REST API,
so that I can build custom reports and dashboards.

## Acceptance Criteria

1. **GET /api/v1/analytics/links/{id} returns link analytics**
   - Given I have a valid API key
   - When I `GET /api/v1/analytics/links/{id}?granularity=daily`
   - Then I receive: overview (id, slug, targetUrl, totalClicks), timeseries data, top referrers, and geo breakdown (FR37)
   - And only analytics for my own links are returned (NFR13)

2. **GET /api/v1/analytics/boards/{id} returns board analytics**
   - Given I have a valid API key
   - When I `GET /api/v1/analytics/boards/{id}?granularity=daily`
   - Then I receive: overview (boardName, totalClicks, linkCount, topLinks), timeseries data, top referrers, and geo breakdown (FR37)
   - And only analytics for my own boards are returned (NFR13)

3. **Granularity query parameter**
   - When I include `?granularity=daily|weekly|monthly`
   - Then timeseries data is bucketed accordingly
   - Default: `daily` if omitted

4. **Authorization and error handling**
   - No auth / invalid API key → 401 `{ error: { code: "UNAUTHORIZED" } }`
   - Link/board doesn't exist or I don't own it → 404 `{ error: { code: "NOT_FOUND" } }`
   - Invalid granularity value → 400 `{ error: { code: "VALIDATION_ERROR" } }`

5. **Session auth backward compatibility**
   - Both API key auth and session auth work (via `resolveUserId`)

## Tasks / Subtasks

- [x] Task 1: Create Zod validation schema for analytics query params (AC: #3, #4)
  - [x] 1.1 Create `src/lib/validations/api-analytics.ts` with `analyticsQuerySchema`
  - [x] 1.2 Schema: `{ granularity: z.enum(["daily","weekly","monthly"]).default("daily") }`
- [x] Task 2: Create GET /api/v1/analytics/links/[id] route handler (AC: #1, #4, #5)
  - [x] 2.1 Create `src/app/api/v1/analytics/links/[id]/route.ts`
  - [x] 2.2 Auth via `resolveUserId(request)` → 401 if null
  - [x] 2.3 Parse query params with `analyticsQuerySchema`
  - [x] 2.4 Call existing DB functions: `getLinkAnalyticsOverview`, `getLinkClicksTimeseries`, `getLinkReferrerBreakdown`, `getLinkGeoBreakdown`
  - [x] 2.5 If overview is null → 404 (link not found or not owned)
  - [x] 2.6 Return composed response via `successResponse()`
- [x] Task 3: Create GET /api/v1/analytics/boards/[id] route handler (AC: #2, #4, #5)
  - [x] 3.1 Create `src/app/api/v1/analytics/boards/[id]/route.ts`
  - [x] 3.2 Same auth/validation pattern as link analytics
  - [x] 3.3 Call: `getBoardAnalyticsOverview`, `getBoardClicksTimeseries`, `getBoardReferrerBreakdown`, `getBoardGeoBreakdown`
  - [x] 3.4 If overview is null → 404
  - [x] 3.5 Return composed response via `successResponse()`
- [x] Task 4: Write tests for link analytics endpoint (AC: #1, #3, #4, #5)
  - [x] 4.1 Create `src/app/api/v1/analytics/links/[id]/route.test.ts`
  - [x] 4.2 Test matrix: no-auth→401, invalid-key→401, valid-key→success, valid-session→success, ownership→404
  - [x] 4.3 Test granularity param: default, each valid value, invalid value→400
  - [x] 4.4 Test response shape matches expected structure
- [x] Task 5: Write tests for board analytics endpoint (AC: #2, #3, #4, #5)
  - [x] 5.1 Create `src/app/api/v1/analytics/boards/[id]/route.test.ts`
  - [x] 5.2 Same test matrix as link analytics
- [x] Task 6: Verify full test suite passes with no regressions

## Dev Notes

### Key Implementation Pattern

This story follows the exact same pattern as Stories 7.2 and 7.3: thin route handlers that authenticate, validate, call existing DB functions, and return formatted responses. **All analytics query functions already exist** in `src/lib/db/analytics.ts` — no new DB code needed.

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/validations/api-analytics.ts` | Zod schema for `granularity` query param |
| `src/app/api/v1/analytics/links/[id]/route.ts` | Link analytics GET handler |
| `src/app/api/v1/analytics/boards/[id]/route.ts` | Board analytics GET handler |
| `src/app/api/v1/analytics/links/[id]/route.test.ts` | Link analytics tests |
| `src/app/api/v1/analytics/boards/[id]/route.test.ts` | Board analytics tests |

### Files to Reuse (DO NOT modify or duplicate)

| File | What to import |
|------|---------------|
| `src/lib/db/analytics.ts` | `getLinkAnalyticsOverview`, `getLinkClicksTimeseries`, `getLinkReferrerBreakdown`, `getLinkGeoBreakdown`, `getBoardAnalyticsOverview`, `getBoardClicksTimeseries`, `getBoardReferrerBreakdown`, `getBoardGeoBreakdown` |
| `src/lib/api-response.ts` | `successResponse`, `errorResponse` |
| `src/lib/errors.ts` | `AppError` |
| `src/lib/auth/api-key-middleware.ts` | `resolveUserId` |
| `src/lib/validations/helpers.ts` | `fieldErrorsFromZod` |
| `src/lib/logger.ts` | `logger` |

### Route Handler Template

Follow the exact pattern from `src/app/api/v1/links/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { resolveUserId } from "@/lib/auth/api-key-middleware";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
// + analytics DB imports
// + validation schema import

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(request);
  if (!userId) {
    return NextResponse.json(
      errorResponse(new AppError("UNAUTHORIZED", "Authentication required", 401)),
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    // Parse query params from request.url
    const url = new URL(request.url);
    const parsed = analyticsQuerySchema.safeParse({
      granularity: url.searchParams.get("granularity") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(new AppError("VALIDATION_ERROR", "Invalid query parameters", 400), {
          fields: fieldErrorsFromZod(parsed.error),
        }),
        { status: 400 },
      );
    }

    // Call existing DB functions and compose response
    // If overview is null → 404
    // Return successResponse({ overview, timeseries, referrers, geoBreakdown })
  } catch (error) {
    // Standard error handling pattern
  }
}
```

### Expected Response Shapes

**Link analytics:**
```json
{
  "data": {
    "overview": {
      "id": "uuid",
      "slug": "my-link",
      "targetUrl": "https://example.com",
      "totalClicks": 1234
    },
    "timeseries": {
      "granularity": "daily",
      "data": [
        { "label": "2026-03-16", "periodStart": "2026-03-16T00:00:00.000Z", "clicks": 42 }
      ]
    },
    "referrers": [
      { "domain": "Direct / Unknown", "clicks": 500 },
      { "domain": "twitter.com", "clicks": 234 }
    ],
    "geoBreakdown": [
      { "country": "US", "clicks": 600 },
      { "country": "GB", "clicks": 234 }
    ]
  }
}
```

**Board analytics:**
```json
{
  "data": {
    "overview": {
      "boardName": "My Links",
      "totalClicks": 5000,
      "linkCount": 15,
      "topLinks": [
        { "id": "uuid", "slug": "link1", "title": "Article", "clicks": 500 }
      ]
    },
    "timeseries": {
      "granularity": "daily",
      "data": [
        { "label": "2026-03-16", "periodStart": "2026-03-16T00:00:00.000Z", "clicks": 42 }
      ]
    },
    "referrers": [
      { "domain": "Direct / Unknown", "clicks": 500 }
    ],
    "geoBreakdown": [
      { "country": "US", "clicks": 600 }
    ]
  }
}
```

### Test Mock Pattern

Follow the exact mock pattern from Story 7.3 tests:

```typescript
vi.mock("@/lib/auth/api-key-middleware", () => ({
  authenticateApiKey: vi.fn(),
  resolveUserId: vi.fn(),
}));

vi.mock("@/lib/db/analytics", () => ({
  getLinkAnalyticsOverview: vi.fn(),
  getLinkClicksTimeseries: vi.fn(),
  getLinkReferrerBreakdown: vi.fn(),
  getLinkGeoBreakdown: vi.fn(),
}));
```

### Test Matrix (per endpoint)

1. No auth → 401 `{ error: { code: "UNAUTHORIZED" } }`
2. Invalid API key → 401
3. Valid API key → success with correct response shape
4. Valid session → success (backward compatibility)
5. Ownership enforcement → 404 when overview returns null
6. Default granularity → "daily" when not specified
7. Each valid granularity → passed to timeseries function
8. Invalid granularity → 400 validation error

### Architecture Compliance

- **API versioning**: All routes under `/api/v1/analytics/`
- **Response format**: `{ data: T }` for success, `{ error: { code, message, details? } }` for errors
- **Auth**: `resolveUserId()` dual-auth (API key first, session fallback)
- **Ownership**: Enforced by DB functions (`userId` param in all analytics queries)
- **Performance**: < 200ms p95 (NFR2) — existing analytics queries use indexed lookups on `click_events(link_id, clicked_at)`
- **No business logic in route handlers**: Handlers only authenticate, validate, call DB, format response

### Previous Story Intelligence

From Story 7.3:
- Minimal-change philosophy works well — reuse existing patterns exactly
- `resolveUserId` swap is straightforward and proven
- Test matrix is consistent across all API routes
- Response envelopes are standardized via `errorResponse()`/`successResponse()`
- All 464 tests passed after Story 7.3 with no regressions

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 7.4: Analytics REST API Endpoints]
- [Source: _bmad-output/planning-artifacts/architecture.md — API Design Patterns, Analytics Architecture]
- [Source: src/lib/db/analytics.ts — All 8 analytics query functions]
- [Source: src/app/api/v1/links/[id]/route.ts — Route handler pattern reference]
- [Source: _bmad-output/implementation-artifacts/7-3-dev-story-result.md — Previous story learnings]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `npm test -- src/app/api/v1/analytics/links/[id]/route.test.ts src/app/api/v1/analytics/boards/[id]/route.test.ts`
- `npm test`
- `npm run lint -- src/app/api/v1/analytics/links/[id]/route.ts src/app/api/v1/analytics/boards/[id]/route.ts src/app/api/v1/analytics/links/[id]/route.test.ts src/app/api/v1/analytics/boards/[id]/route.test.ts src/lib/validations/api-analytics.ts`

### Completion Notes List

- Added `analyticsQuerySchema` for `granularity=daily|weekly|monthly` with default `daily`.
- Implemented `GET /api/v1/analytics/links/[id]` using `resolveUserId`, existing analytics DB queries, validation, 401/404/400 handling, and standard response envelopes.
- Implemented `GET /api/v1/analytics/boards/[id]` with the same auth/validation/ownership/error pattern.
- Added endpoint coverage for API key auth, session auth, ownership 404s, default and explicit granularities, validation failures, and Prisma UUID fallbacks.
- Full Vitest suite passed after changes.

### File List

- `src/lib/validations/api-analytics.ts`
- `src/app/api/v1/analytics/links/[id]/route.ts`
- `src/app/api/v1/analytics/boards/[id]/route.ts`
- `src/app/api/v1/analytics/links/[id]/route.test.ts`
- `src/app/api/v1/analytics/boards/[id]/route.test.ts`

### Senior Developer Review (AI)

**Reviewer:** Amelia (claude-opus-4-6) on 2026-03-19

**Outcome:** Approved with fixes applied

**Findings:**
- **C1 [FIXED]:** All tasks marked `[ ]` instead of `[x]` despite being complete. Checked off all tasks.
- **M1 [FIXED]:** Error log context missing resource ID in both route handlers. Added `linkId`/`boardId` to logger calls.
- **M2 [DEFERRED]:** No test for unexpected error logging path — project-wide gap, not story-specific. Not actionable here.
- **L1:** `AnalyticsQuery` type exported but unused in `api-analytics.ts:7`. Cosmetic.
- **L2:** Zod error message assertions are brittle but match project convention.

**AC Validation:** All 5 ACs fully implemented and tested.
**Test Results:** 485 passed, 9 skipped (0 regressions). 20/20 analytics tests pass.

### Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-03-19 | Amelia (review) | Fixed task checkboxes, added resource ID to error logs, set status to done |
