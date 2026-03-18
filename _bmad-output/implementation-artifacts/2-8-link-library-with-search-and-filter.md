# Story 2.8: Link Library with Search and Filter

Status: review

## Story

As a logged-in user,
I want to browse all my links with search and filtering,
so that I can quickly find any link I've created.

## Acceptance Criteria

1. **Given** I am logged in and navigate to the link library page, **When** the page loads, **Then** I see a paginated list of all my links (default 20 per page, max 100) with title, slug, target URL, click count placeholder, and tags. I can see which boards each link belongs to (FR29 — boards are Epic 3, so show "No boards" placeholder for now).

2. **Given** I type in the search box, **When** I submit a search query, **Then** links are filtered by title, tags, target URL, or slug (FR28). Search uses URL query parameters (`?q=`) for shareable/bookmarkable URLs.

3. **Given** I select a tag filter, **When** the filter is applied, **Then** only links with that tag are shown. Tag filter uses URL query parameter (`?tag=`).

4. **Given** the link list has more than 20 items, **When** I navigate pages, **Then** pagination controls appear with page numbers and the current page is reflected in URL query parameter (`?page=`).

5. **Given** the link library is displayed, **Then** it is accessible with keyboard navigation and visible focus indicators (NFR20, NFR22). Loading states use skeleton UI, not raw "Loading..." text.

## Tasks / Subtasks

- [ ] Add server-side search/filter/paginate query function (AC: #1, #2, #3, #4)
  - [ ] Add `findLinksForLibrary()` to `src/lib/db/links.ts` — accepts `userId`, `query`, `tag`, `page`, `limit`; returns `{ links, total }`
  - [ ] Use Prisma `where` with `OR` for search across `title`, `slug`, `targetUrl` using `contains` (case-insensitive via `mode: "insensitive"`)
  - [ ] Use Prisma `where` with `has` for tag filter on the `tags` string array
  - [ ] Apply offset-based pagination: `skip = (page - 1) * limit`, `take = limit`
  - [ ] Return total count via `prisma.link.count()` with same where clause
  - [ ] Write tests: `src/lib/db/links.test.ts` (extend existing)

- [ ] Add Zod validation schema for search/filter query params (AC: #2, #3, #4)
  - [ ] Add `linkLibraryQuerySchema` to `src/lib/validations/link.ts` — validates `q` (optional string, max 200 chars), `tag` (optional string, max 24 chars), `page` (optional int, min 1, default 1), `limit` (optional int, min 1, max 100, default 20)

- [ ] Create API endpoint for paginated link listing (AC: #1, #2, #3, #4)
  - [ ] Create `src/app/api/v1/links/route.ts` — GET handler (if not exists, or add GET to existing)
  - [ ] Parse and validate query params with `linkLibraryQuerySchema`
  - [ ] Call `findLinksForLibrary()` with validated params
  - [ ] Return `{ data: links[], pagination: { total, limit, offset } }` response format
  - [ ] Write route handler tests

- [ ] Refactor link library page to use URL-based search/filter state (AC: #1, #2, #3, #4, #5)
  - [ ] Update `src/app/(dashboard)/links/page.tsx` — server component reads `searchParams`, calls `findLinksForLibrary()`
  - [ ] Pass search results + pagination metadata to client components

- [ ] Create search and filter controls component (AC: #2, #3)
  - [ ] Create `src/components/links/link-filters.tsx` — client component with search input and tag filter
  - [ ] Search input: `useSearchParams()` + `useRouter()` to update URL on submit (debounced or on Enter)
  - [ ] Tag filter: dropdown or clickable tag list from available tags
  - [ ] Keyboard accessible with visible focus indicators

- [ ] Create pagination component (AC: #4)
  - [ ] Create `src/components/links/link-pagination.tsx` — client component with page navigation
  - [ ] Shows page numbers, prev/next buttons, current page highlight
  - [ ] Updates URL `?page=` param on click
  - [ ] Keyboard accessible

- [ ] Update LinkLibrary component for new data shape (AC: #1, #5)
  - [ ] Modify `src/components/links/link-library.tsx` — remove client-side state management for the links list
  - [ ] Accept paginated data from server component instead of all links
  - [ ] Keep inline edit/delete functionality but trigger router.refresh() after mutations instead of local state updates
  - [ ] Add "No boards" placeholder for board membership display (FR29 — boards built in Epic 3)
  - [ ] Add click count placeholder (analytics built in Epic 6)

- [ ] Add loading state (AC: #5)
  - [ ] Create `src/app/(dashboard)/links/loading.tsx` — skeleton UI for link library page

- [ ] Write comprehensive tests (AC: all)
  - [ ] DB query tests for `findLinksForLibrary` (search, tag filter, pagination, empty results)
  - [ ] API route handler tests for GET `/api/v1/links`
  - [ ] Component tests for `link-filters.tsx` and `link-pagination.tsx`
  - [ ] Regression: all existing Story 2.1–2.7 tests (207 passed, 8 skipped) must continue passing

## Dev Notes

### Architecture Compliance

- **URL state management** — Use `useSearchParams()` for search/filter/pagination state. This makes URLs shareable and bookmarkable. Do NOT use React `useState` for filter state. [Source: architecture.md — State Management]
- **Server component data fetching** — The `links/page.tsx` server component fetches data. Client components handle only UI interactions (search input, pagination clicks). [Source: architecture.md — Component Boundaries]
- **Offset-based pagination** — `limit` + `offset` query params. Default `limit=20`, max `limit=100`. Response includes `{ pagination: { total, limit, offset } }`. [Source: architecture.md — Data Exchange Formats]
- **API response format** — `{ data: [...] }` or `{ error: { code, message } }`. List responses include `pagination` object. [Source: architecture.md — API Response Formats]
- **Data access boundary** — `lib/db/*` is the ONLY module that imports Prisma client. Route handlers call `lib/db/` functions, never Prisma directly. [Source: architecture.md line 644]
- **Zod validation at API boundary** — Validate query params in route handler using Zod schema from `lib/validations/link.ts`. [Source: architecture.md — Validation Pattern]
- **Loading states** — Use `loading.tsx` file for Next.js Suspense boundaries. Use skeleton UI, never raw "Loading..." text. [Source: architecture.md — Loading States]
- **Structured logging** — Use `logger` from `src/lib/logger.ts`, never `console.log`. [Source: architecture.md]

### Technical Requirements

- **Search implementation**: Use Prisma `contains` with `mode: "insensitive"` for text search across `title`, `slug`, `targetUrl`. This maps to PostgreSQL `ILIKE`. For tag search, use Prisma `has` on the string array field. This is sufficient for MVP scale — full-text search (tsvector) is not needed at <100k links per user.
- **Pagination math**: `offset = (page - 1) * limit`. Total pages = `Math.ceil(total / limit)`. Return `total`, `limit`, `offset` in pagination response. The UI converts offset to page number for display.
- **URL query params**: `?q=search+term&tag=javascript&page=2&limit=20`. All params optional. Empty/missing params mean "no filter". Use `searchParams` prop in server component (Next.js App Router passes this automatically).
- **No shadcn/ui yet**: The project has NO `src/components/ui/` directory. Do NOT install shadcn/ui for this story. Use plain HTML/Tailwind CSS matching the existing component style (see `link-library.tsx`, `create-link-form.tsx`). shadcn/ui installation can happen in a later story when the dashboard is built (Epic 4).
- **Board membership (FR29)**: The `Board` and `BoardLink` models don't exist yet (Epic 3). Display a placeholder like "Not assigned to any boards" for each link. Do NOT create board-related queries or UI.
- **Click count**: Analytics are Epic 6. Display a placeholder or omit click count. Do NOT create analytics queries.

### Existing Code to Reuse

- **`findLinksByUserId(userId: string)`** in `src/lib/db/links.ts` (line 67) — Currently returns ALL user links with no filtering or pagination. This story adds a new `findLinksForLibrary()` function alongside it. Do NOT modify `findLinksByUserId` — it may be used elsewhere. Add a new function.
- **`LinkLibrary` component** in `src/components/links/link-library.tsx` — Existing component displays all links with edit/delete. This needs refactoring to accept paginated data and use `router.refresh()` for mutations instead of local state. The `LinkCard` sub-component, `LinkMetadataBlock`, and `LinkExpirationBadge` can be reused as-is.
- **`toLinkResponse()`** in `src/lib/api-response.ts` — Serializes Link model to API response format. Reuse for the GET links endpoint.
- **`successResponse()`** in `src/lib/api-response.ts` — Wraps data in `{ data }` format.
- **`linkLibraryQuerySchema`** — Does NOT exist yet. Create it in `src/lib/validations/link.ts`.
- **`src/app/api/v1/links/route.ts`** — Check if this file exists. If it has a POST handler for link creation, add a GET handler to the same file. If it doesn't exist, create it with GET handler only.
- **`src/lib/errors.ts`** — `AppError` class for business logic errors.
- **`src/lib/logger.ts`** — Structured JSON logger.
- **`src/lib/auth/config.ts`** — `auth()` function for session checks in server components and route handlers.

### Scope Boundaries

**IN scope for this story:**
- `findLinksForLibrary()` query function with search, tag filter, pagination
- `linkLibraryQuerySchema` Zod validation
- GET `/api/v1/links` endpoint with search/filter/pagination
- Search input + tag filter component (`link-filters.tsx`)
- Pagination component (`link-pagination.tsx`)
- Refactored `LinkLibrary` component accepting paginated data
- `loading.tsx` skeleton for link library page
- Updated `links/page.tsx` server component with searchParams
- Tests for all new/modified code

**OUT of scope — do NOT implement:**
- Board membership display with real data (Epic 3 — Story 3.3)
- Click count / analytics data (Epic 6 — Story 6.2)
- Board filter dropdown with real boards (Epic 3)
- Full-text search with PostgreSQL tsvector (premature optimization)
- Infinite scroll (use pagination)
- Client-side caching/SWR for link data (use server component data fetching)
- shadcn/ui component library installation (no `src/components/ui/` exists yet)
- Sort controls (sort by date, title, etc.) — not in acceptance criteria
- Bulk operations (bulk delete, bulk tag) — not in acceptance criteria

### File / Technical Scope

Files to **create**:
- `src/components/links/link-filters.tsx` — Search input + tag filter controls
- `src/components/links/link-filters.test.tsx` — Filter component tests
- `src/components/links/link-pagination.tsx` — Pagination controls
- `src/components/links/link-pagination.test.tsx` — Pagination component tests
- `src/app/(dashboard)/links/loading.tsx` — Skeleton loading UI

Files to **modify**:
- `src/lib/db/links.ts` — Add `findLinksForLibrary()` function
- `src/lib/validations/link.ts` — Add `linkLibraryQuerySchema`
- `src/app/(dashboard)/links/page.tsx` — Read searchParams, call new query, pass paginated data
- `src/components/links/link-library.tsx` — Accept paginated data, use `router.refresh()` for mutations
- `src/app/api/v1/links/route.ts` — Add GET handler (create file if it doesn't exist)

Files to **NOT modify**:
- `prisma/schema.prisma` — No schema changes. Link model already has all needed fields.
- `src/middleware.ts` — No changes needed. Redirect resolution is unrelated.
- `src/lib/cache/*` — No cache changes needed. Link library reads are not cached in Redis.
- `src/components/links/create-link-form.tsx` — Leave link creation form unchanged.

### Testing Requirements

- **DB query tests** (extend `src/lib/db/links.test.ts`): Test `findLinksForLibrary` with mock Prisma. Test search across title/slug/targetUrl. Test tag filter. Test pagination (offset, limit, total count). Test combined search + tag + pagination. Test empty results.
- **API route tests** (new or extend): Test GET `/api/v1/links` returns paginated data. Test search query param filtering. Test tag query param filtering. Test pagination params. Test unauthenticated returns 401. Test invalid params return 400.
- **Component tests**: Test `link-filters.tsx` renders search input and tag filter. Test search submission updates URL. Test `link-pagination.tsx` renders page numbers. Test page click updates URL.
- **Regression**: All existing tests (207 passed, 8 skipped) must continue passing.

### Anti-Patterns to Avoid

- Do NOT use `useState` for search/filter/pagination state — use URL searchParams via `useSearchParams()` + `useRouter()`.
- Do NOT fetch all links client-side and filter in JavaScript — use server-side Prisma queries with `where` clauses.
- Do NOT install shadcn/ui — no `src/components/ui/` directory exists. Use plain HTML + Tailwind matching existing patterns.
- Do NOT create a `utils.ts` catch-all file — put pagination helpers in the DB query function or a small dedicated module.
- Do NOT use `console.log` — use the structured logger from `src/lib/logger.ts`.
- Do NOT import Prisma client outside `lib/db/` — all data access goes through `lib/db/links.ts`.
- Do NOT use `any` type — use `unknown` and narrow, or define proper types.
- Do NOT modify `findLinksByUserId()` — it may be used by other code. Add a new function.
- Do NOT build board membership queries or components — boards don't exist yet (Epic 3).
- Do NOT build analytics/click count queries — analytics are Epic 6.
- Do NOT use `302` redirects in pagination links — use regular `<a>` or `Link` with query params.
- Do NOT block the UI during search — use `startTransition` or similar for non-blocking URL updates.

### Previous-Story Intelligence

- **Story 2.7** completed with 207 tests passing, 8 skipped (DB integration tests — no local DB). All test suites pass. Agent model: openai/gpt-5.4.
- **Story 2.7** established `src/lib/cache/` module boundary (Redis client, redirect cache, invalidation). This story does NOT need Redis — link library reads go directly to PostgreSQL.
- **Existing `LinkLibrary` component** (`src/components/links/link-library.tsx`, 336 lines) uses local `useState` for the links array and handles edit/delete via optimistic local state updates. This story needs to refactor this to use `router.refresh()` instead, since the server component now handles data fetching with pagination. The `LinkCard`, `LinkMetadataBlock`, and `LinkExpirationBadge` sub-components can remain unchanged.
- **Existing `links/page.tsx`** (server component) calls `findLinksByUserId()` which returns ALL links unsorted. This story replaces that call with `findLinksForLibrary()` which supports search, filter, and pagination.
- **Code conventions** from previous stories: `verbNoun` function naming (e.g., `createLink`, `findLinkById`), co-located `*.test.ts` files, `describe`/`it` test blocks, logger key format `"module.action"`, Tailwind dark theme with zinc/emerald color palette, rounded-2xl/3xl border-zinc-800 card patterns.
- **API response pattern**: `successResponse({ data })` with `toLinkResponse()` for serialization. Error responses use `AppError` with structured error format.

### Git Intelligence

Recent commits follow `[BMAD Phase 4] Story X.Y: Description` pattern. Key patterns:
- Single commit per story with all files
- Function naming: `createLink`, `findLinkBySlug`, `updateLink`, `deleteLink`, `findLinksByUserId` → new: `findLinksForLibrary`
- Test describe blocks follow function or route naming
- 207 tests currently passing, 8 skipped

### Project Structure Notes

```
src/lib/db/links.ts               # MODIFY — add findLinksForLibrary()
src/lib/validations/link.ts       # MODIFY — add linkLibraryQuerySchema
src/app/api/v1/links/route.ts     # CREATE or MODIFY — add GET handler
src/app/(dashboard)/links/
  page.tsx                         # MODIFY — use searchParams + findLinksForLibrary()
  loading.tsx                      # CREATE — skeleton loading UI
src/components/links/
  link-library.tsx                 # MODIFY — accept paginated data, router.refresh()
  link-filters.tsx                 # CREATE — search + tag filter
  link-filters.test.tsx            # CREATE — filter tests
  link-pagination.tsx              # CREATE — pagination controls
  link-pagination.test.tsx         # CREATE — pagination tests
```

Alignment with architecture.md directory structure: `components/links/*` for feature components, `app/(dashboard)/links/*` for dashboard pages, `lib/db/links.ts` for data access, `lib/validations/link.ts` for schemas.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.8: Link Library with Search and Filter]
- [Source: _bmad-output/planning-artifacts/epics.md — FR27 (link library view), FR28 (search/filter), FR29 (board membership)]
- [Source: _bmad-output/planning-artifacts/architecture.md — State Management: Server Components + URL state]
- [Source: _bmad-output/planning-artifacts/architecture.md — Pagination: offset-based, limit/offset, default 20, max 100]
- [Source: _bmad-output/planning-artifacts/architecture.md — API Response Formats: { data, pagination }]
- [Source: _bmad-output/planning-artifacts/architecture.md — Component Boundaries: server components fetch, client components interact]
- [Source: _bmad-output/planning-artifacts/architecture.md — Data Boundaries: lib/db/* only module importing Prisma]
- [Source: _bmad-output/planning-artifacts/architecture.md — File Structure: components/links/*, app/(dashboard)/links/*]
- [Source: _bmad-output/planning-artifacts/architecture.md — Naming: kebab-case files, PascalCase components, camelCase functions]
- [Source: _bmad-output/planning-artifacts/architecture.md — Testing: Vitest 4, co-located tests, *.test.ts next to source]
- [Source: _bmad-output/planning-artifacts/architecture.md — Loading States: loading.tsx + skeleton UI, never raw "Loading..." text]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR20 (WCAG 2.1 AA), NFR22 (keyboard navigation)]
- [Source: _bmad-output/implementation-artifacts/2-7-redirect-engine-with-redis-caching.md — Previous story patterns, 207 tests passing]
- [Source: src/components/links/link-library.tsx — Existing LinkLibrary component to refactor]
- [Source: src/lib/db/links.ts — Existing findLinksByUserId() function, data access patterns]
- [Source: src/lib/api-response.ts — toLinkResponse(), successResponse() helpers]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `npm run lint`
- `npm test`

### Completion Notes List

- Added `findLinksForLibrary()` and a reusable where-clause builder in `src/lib/db/links.ts` for server-side search, tag filtering, and offset pagination.
- Added `linkLibraryQuerySchema` and wired GET `/api/v1/links` to validate `q`, `tag`, `page`, and `limit`, then return `{ data, pagination }`.
- Refactored the dashboard links page to read URL search params on the server, render filter controls, paginated results, and a skeleton loading state.
- Reworked `LinkLibrary` to use server-provided paginated data, `router.refresh()` after mutations, and placeholder badges for boards and click count.
- Added focused tests for DB query construction, query validation, GET route behavior, filter controls, pagination controls, and refreshed link-library behavior.
- Validation outcome: `npm run lint` passed; `npm test` passed with 215 tests green and 8 skipped integration tests due missing local DB tables/availability.

### File List

- `_bmad-output/implementation-artifacts/2-8-dev-plan.md`
- `_bmad-output/implementation-artifacts/2-8-link-library-with-search-and-filter.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/progress.md`
- `src/app/(dashboard)/links/loading.tsx`
- `src/app/(dashboard)/links/page.tsx`
- `src/app/api/v1/links/route.test.ts`
- `src/app/api/v1/links/route.ts`
- `src/components/links/link-filters.test.tsx`
- `src/components/links/link-filters.tsx`
- `src/components/links/link-library.test.tsx`
- `src/components/links/link-library.tsx`
- `src/components/links/link-pagination.test.tsx`
- `src/components/links/link-pagination.tsx`
- `src/lib/db/links.library.test.ts`
- `src/lib/db/links.ts`
- `src/lib/validations/link.test.ts`
- `src/lib/validations/link.ts
