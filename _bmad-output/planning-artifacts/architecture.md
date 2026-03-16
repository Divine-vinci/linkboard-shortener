---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-16'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief.md
workflowType: 'architecture'
project_name: 'Linkboard'
user_name: 'User'
date: '2026-03-16'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
42 functional requirements across 8 capability areas. The architecture must support two distinct traffic patterns: (1) high-volume, latency-sensitive redirect resolution (FR7) and (2) standard CRUD operations for links, boards, users, and analytics. The board-centric organization model (FR8-FR15) drives the data model with many-to-many link-board relationships, visibility controls, and ordering. Public board rendering (FR40-FR42) requires SSR capability separate from the SPA dashboard.

**Non-Functional Requirements:**
24 NFRs with the most architecturally significant being:
- **NFR1**: < 50ms p99 redirect latency — requires caching layer and minimal processing in the redirect path
- **NFR6**: Analytics writes must not block redirects — requires async event pipeline
- **NFR16-17**: Horizontal scaling for redirects, 1M redirects/month capacity — stateless redirect instances with shared cache
- **NFR7-15**: Standard web security (TLS, hashed passwords/API keys, input sanitization, rate limiting) — no exotic security requirements
- **NFR20-24**: WCAG 2.1 AA — impacts frontend component selection and public board design

**Scale & Complexity:**

- Primary domain: Full-stack web application (SPA + REST API + redirect engine)
- Complexity level: Low-medium
- Estimated architectural components: 6-8 (redirect engine, API server, SPA frontend, SSR renderer, database, cache, analytics pipeline, auth service)

### Technical Constraints & Dependencies

- **Redirect latency budget (< 50ms p99)**: The single most constraining requirement. Redirect resolution must bypass the full application stack — direct cache lookup preferred, database fallback with indexed O(1) lookups.
- **API-first design**: The SPA and external API consumers share the same REST API surface. No internal-only endpoints — everything is a public contract.
- **SSR for public boards**: Public pages need server-side rendering for SEO and social media previews (Open Graph, Twitter Cards). This means either a Node.js SSR layer or a separate lightweight template renderer.
- **OAuth provider dependency**: GitHub and Google OAuth for signup/login — external service dependency for authentication flow.
- **Small team constraint**: 2-3 engineers — architecture must minimize operational complexity. Fewer moving parts, boring technology, managed services where possible.

### Cross-Cutting Concerns Identified

- **Authentication & Authorization**: Three auth mechanisms (session-based for SPA, API key for developers, none for public boards) with per-resource ownership checks (NFR13)
- **Analytics Event Capture**: Every redirect and potentially every API action generates telemetry. Must be fire-and-forget from the caller's perspective.
- **Caching Strategy**: Redirect resolution is the hot path — cache invalidation on link updates is critical. Board data caching for public boards to meet LCP targets.
- **Input Validation & Sanitization**: Custom slug validation (NFR15), XSS/injection prevention (NFR11), rate limiting on auth endpoints (NFR12)
- **Error Handling & Observability**: < 0.1% error rate target (NFR) requires structured logging and monitoring across all components

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application requiring: SPA dashboard (authenticated), SSR public pages (SEO-critical), RESTful API (internal + external consumers), and a latency-sensitive redirect engine. This maps to a Next.js monolith architecture.

### Starter Options Considered

**Option 1: Next.js 16 (create-next-app) — SELECTED**
- Current version: 16.1.6 (App Router, Turbopack default)
- Default stack: TypeScript, Tailwind CSS, ESLint, App Router
- Strengths: Edge middleware for redirects, mixed SSR/client rendering, Route Handlers for REST API, largest ecosystem, one codebase/deployment
- Weakness: Vercel-centric ecosystem (mitigated by self-hosting capability)

**Option 2: T3 Stack (create-t3-app v7.40)**
- Stack: Next.js + tRPC + Prisma + NextAuth
- Strengths: Full-stack type safety, auth included, Prisma ORM
- **Disqualified**: tRPC is not REST — PRD requires RESTful API for external consumers (FR34-FR39). Would need to maintain both tRPC (internal) and REST (external) API surfaces, doubling API maintenance for a small team.

**Option 3: React Router v7 (Remix successor)**
- Stack: React Router v7 in Framework Mode
- Strengths: Web-standards focused, smaller bundle (371KB vs 566KB), server-first rendering
- Weakness: Smaller ecosystem, no equivalent to Next.js edge middleware for the redirect engine, less mature API route support. Not the pragmatic choice for a 2-3 person team.

### Selected Starter: Next.js 16 (create-next-app)

**Rationale for Selection:**
Next.js 16 provides the best balance of capability and simplicity for Linkboard's requirements. Edge middleware enables ultra-fast redirect resolution without a separate service. App Router supports both SSR (public boards) and client-side rendering (dashboard) in a single codebase. Route Handlers provide REST API endpoints consumed by both the SPA and external developers. The ecosystem is the largest in React-land, minimizing "stuck" time for a small team.

**Initialization Command:**

```bash
npx create-next-app@latest linkboard --yes
```

This creates a project with TypeScript, Tailwind CSS, ESLint, App Router, and Turbopack enabled by default.

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript with strict mode, Node.js 20.9+ runtime, React 19 (canary channel via App Router)

**Styling Solution:**
Tailwind CSS v4 with PostCSS — utility-first CSS, no CSS-in-JS runtime overhead. Aligns with performance targets for public board rendering.

**Build Tooling:**
Turbopack (default bundler in Next.js 16) for development and production builds. Significantly faster than Webpack for large projects.

**Testing Framework:**
Not included by starter — will need to add. Vitest + React Testing Library recommended (covered in architectural decisions).

**Code Organization:**
App Router file-system routing with `app/` directory. Route groups, layouts, and server/client component boundaries established by convention.

**Development Experience:**
Hot module replacement via Turbopack, TypeScript type checking, ESLint integration, `@/*` import alias configured.

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Database: PostgreSQL 18 with Prisma 7 ORM
- Authentication: Auth.js v5 (session) + custom API key auth
- Caching: Redis 8 for redirect resolution
- API: REST via Next.js Route Handlers with Zod 4 validation

**Important Decisions (Shape Architecture):**
- Frontend component library: shadcn/ui (CLI v4)
- Testing: Vitest 4 + React Testing Library
- Analytics pipeline: In-process async with database writes (MVP), extractable to message queue later
- State management: React Server Components + URL state + minimal client context

**Deferred Decisions (Post-MVP):**
- Message queue for analytics (Kafka/SQS — defer until traffic exceeds MVP thresholds)
- CDN-level redirect caching (defer until scale demands it)
- Custom domain SSL provisioning (v2.0 feature)
- Real-time collaboration infrastructure (v3.0 feature)

### Data Architecture

**Database: PostgreSQL 18**
- Category: Critical
- Rationale: Relational data model is natural for users → boards → links (many-to-many). PostgreSQL's jsonb for link metadata, full-text search for link library filtering (FR28), and mature ecosystem. The boring, proven choice.
- Affects: All data persistence, analytics storage, search functionality

**ORM: Prisma 7**
- Category: Critical
- Rationale: Prisma 7 rewrote the engine in pure TypeScript (no Rust layer), narrowing the performance gap with Drizzle while maintaining superior DX — auto-generated types, declarative schema, built-in migrations. Schema-first approach provides clear data model documentation for the team. The generated client serves as living documentation of the data layer.
- Trade-off: Slightly more overhead than Drizzle's raw SQL generation, but acceptable for CRUD operations (redirect hot path uses Redis, not ORM).
- Version: Prisma 7.x (latest)

**Caching: Redis 8**
- Category: Critical
- Rationale: Redirect resolution is the hot path. Redis provides O(1) key-value lookups for slug → target URL mapping. Cache-aside pattern: check Redis first, fall back to PostgreSQL on miss, populate cache on miss. Cache invalidation on link update/delete.
- Affects: Redirect engine (NFR1), public board caching (NFR4)
- Pattern: `slug:{slug}` → `{targetUrl, linkId, expiresAt}`

**Data Validation: Zod 4**
- Category: Important
- Rationale: Runtime schema validation at API boundaries. Zod 4 is 14x faster for string parsing vs Zod 3. Schemas serve as both validation and TypeScript type inference — single source of truth for API contracts.
- Version: Zod 4.3.x (latest)

**Migration Strategy:**
Prisma Migrate for schema migrations. All migrations version-controlled. No manual SQL — Prisma generates migration files from schema changes.

### Authentication & Security

**Session Auth: Auth.js v5 (NextAuth)**
- Category: Critical
- Rationale: Handles email/password + OAuth (GitHub, Google) with session management. Now maintained by the Better Auth team. Integrates natively with Next.js App Router middleware. JWT sessions stored in HTTP-only cookies — no server-side session store needed for MVP.
- Affects: FR21-FR25 (user auth), NFR10 (session expiry), NFR12 (rate limiting)
- Provider: Prisma adapter for user/account/session persistence

**API Key Auth: Custom implementation**
- Category: Critical
- Rationale: Auth.js doesn't handle API key flows. Custom middleware checks `Authorization: Bearer <api-key>` header, hashes and compares against stored keys. API keys hashed with SHA-256 at rest (NFR9), displayed once at creation.
- Affects: FR26 (API key management), FR34-FR39 (API access)

**Password Hashing: bcrypt**
- Category: Critical
- Rationale: Industry standard, well-supported in Node.js. Cost factor 12 for balance of security and performance.
- Affects: NFR8

**Authorization: Ownership-based**
- Category: Critical
- Rationale: Simple ownership model for MVP — users can only access their own resources (NFR13). Middleware checks `userId` on every authenticated request. No complex RBAC needed until team workspaces (v2.0).
- Pattern: Every link/board row has `userId` foreign key. Query filters always include `WHERE userId = :currentUser`.

**Rate Limiting: In-memory + Redis**
- Category: Important
- Rationale: Auth endpoints rate-limited per IP (NFR12: 10 failed attempts / 15 min). API endpoints rate-limited per API key. Use `next-rate-limit` or similar middleware with Redis backing for distributed deployments.

### API & Communication Patterns

**API Style: RESTful via Next.js Route Handlers**
- Category: Critical (already decided by starter + PRD requirement)
- Rationale: PRD mandates REST API (FR34-FR39). Route Handlers in `app/api/` provide file-system-based REST endpoints. Same API consumed by SPA frontend and external developers.
- Pattern: `app/api/v1/links/route.ts`, `app/api/v1/boards/[boardId]/route.ts`

**API Documentation: OpenAPI/Swagger**
- Category: Important
- Rationale: FR39 requires OpenAPI documentation. Generate from Zod schemas using `zod-openapi` or similar. Serve Swagger UI at `/api/docs`.

**Error Handling: Structured error responses**
- Category: Important
- Pattern: `{ error: { code: string, message: string, details?: object } }` with appropriate HTTP status codes. Consistent across all endpoints.

**Analytics Event Pipeline (MVP):**
- Category: Important
- Rationale: NFR6 requires analytics writes don't block redirects. MVP approach: fire-and-forget `INSERT` via a non-blocking database write after the redirect response is sent. Use `waitUntil()` in Next.js middleware/edge runtime to defer work after response.
- Scale path: When traffic exceeds MVP thresholds, extract to Redis Streams or a message queue (SQS/Kafka) for async processing.

### Frontend Architecture

**Component Library: shadcn/ui (CLI v4)**
- Category: Important
- Rationale: Copy-paste components built on Radix UI primitives + Tailwind CSS. WCAG 2.1 AA accessible out of the box (NFR20-24). No npm dependency — components live in the codebase, fully customizable. CLI v4 released March 2026.
- Affects: All UI components, accessibility compliance, dashboard and public board rendering

**State Management: Server Components + URL state**
- Category: Important
- Rationale: React Server Components handle data fetching and server-side state. Client-side state minimized to UI interactions (modals, form state). URL search params for filter/sort/pagination state (shareable, bookmarkable). No global state library needed for MVP.
- Pattern: `useSearchParams()` for list filters, React `useState` for local UI state, server components for data.

**Charts/Analytics Visualization: Recharts**
- Category: Important
- Rationale: Lightweight, composable React charting library. Works with Server Components (renders on client). Covers click timeline, referrer breakdown, geo distribution (FR16-FR20). Text alternatives for screen readers (NFR23).

**Routing Strategy:**
Next.js App Router file-system routing. Route groups for organization:
- `(dashboard)/` — authenticated dashboard pages
- `(public)/` — public board pages (SSR)
- `(auth)/` — login, register, password reset
- `api/v1/` — REST API route handlers
- Middleware handles redirect resolution at the edge before routing

### Infrastructure & Deployment

**Hosting: Vercel (primary) / Docker (self-host)**
- Category: Important
- Rationale: Vercel provides zero-config Next.js deployment with edge middleware, serverless functions, and global CDN. Docker image for self-hosted deployments (product brief mentions self-hostable as a differentiator). Both deployment targets from the same codebase.

**CI/CD: GitHub Actions**
- Category: Important
- Pattern: PR checks (lint, type-check, test), preview deployments on PR, production deploy on main merge. Standard workflow.

**Environment Configuration:**
- `.env.local` for development secrets
- Vercel environment variables for production
- Zod schema validation for all environment variables at startup — fail fast if config is missing

**Monitoring & Logging:**
- Structured JSON logging via `pino` or Next.js built-in logging
- Error tracking via Sentry (free tier sufficient for MVP)
- Uptime monitoring for redirect endpoint (99.9% target)

**Database Hosting:**
- Vercel Postgres (Neon) for Vercel deployments, or any PostgreSQL provider for self-hosted
- Redis: Upstash (serverless Redis, per-request pricing) for Vercel, or self-hosted Redis for Docker deployments

### Decision Impact Analysis

**Implementation Sequence:**
1. Project initialization (create-next-app)
2. Database schema + Prisma setup
3. Auth.js configuration (email/password + OAuth)
4. Core API routes (links CRUD, boards CRUD)
5. Redirect engine (middleware + Redis cache)
6. Dashboard UI (shadcn/ui components)
7. Public board rendering (SSR)
8. Analytics pipeline + visualization
9. API key auth + rate limiting
10. API documentation (OpenAPI)

**Cross-Component Dependencies:**
- Redirect engine depends on: Redis cache + Prisma (database fallback) + analytics pipeline
- Dashboard depends on: Auth.js (session) + API routes + shadcn/ui
- Public boards depend on: SSR rendering + board API + OG meta generation
- Analytics depends on: Event capture (redirect middleware) + database storage + Recharts visualization
- API key auth depends on: Custom middleware + Prisma (key storage)

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 25+ areas where AI agents could make different choices, grouped into 5 categories below.

### Naming Patterns

**Database Naming Conventions:**
- Tables: `snake_case`, plural (`users`, `links`, `boards`, `board_links`, `click_events`)
- Columns: `snake_case` (`created_at`, `target_url`, `user_id`, `is_active`)
- Foreign keys: `{referenced_table_singular}_id` (`user_id`, `board_id`, `link_id`)
- Indexes: `idx_{table}_{columns}` (`idx_links_slug`, `idx_click_events_link_id_clicked_at`)
- Enums: `PascalCase` in Prisma schema (`BoardVisibility`, `LinkStatus`)
- Primary keys: always `id`, UUID type

**API Naming Conventions:**
- Endpoints: plural nouns, `kebab-case` for multi-word resources (`/api/v1/links`, `/api/v1/boards`, `/api/v1/click-events`)
- Route parameters: `[id]`, `[slug]`, `[boardId]` (camelCase in Next.js dynamic segments)
- Query parameters: `camelCase` (`?sortBy=createdAt&limit=20&boardId=abc`)
- HTTP methods: GET (read), POST (create), PATCH (partial update), DELETE (remove)
- No PUT — use PATCH for all updates (partial update semantics)
- Versioned: all API routes under `/api/v1/`

**Code Naming Conventions:**
- Files: `kebab-case.ts` for utilities/lib, `kebab-case.tsx` for components (`link-card.tsx`, `create-link-form.tsx`)
- React components: `PascalCase` (`LinkCard`, `CreateLinkForm`, `BoardAnalytics`)
- Functions/variables: `camelCase` (`getUserLinks`, `boardId`, `isPublic`)
- Constants: `UPPER_SNAKE_CASE` (`MAX_SLUG_LENGTH`, `DEFAULT_PAGE_SIZE`, `CACHE_TTL_SECONDS`)
- Types/interfaces: `PascalCase`, no `I` prefix (`Link`, `Board`, `CreateLinkInput`, `ApiResponse<T>`)
- Zod schemas: `camelCase` with `Schema` suffix (`createLinkSchema`, `updateBoardSchema`)
- Server actions: `camelCase` with verb prefix (`createLink`, `deleteBoard`, `updateLinkTarget`)

### Structure Patterns

**Project Organization:**
- Feature-based organization within `app/` directory (Next.js convention)
- Shared code in `lib/` directory at project root
- Co-located tests: `*.test.ts` next to the file they test (`lib/links.ts` → `lib/links.test.ts`)
- Component tests: `*.test.tsx` co-located with component files

**Directory Structure Convention:**
```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── (auth)/             # Auth pages (login, register, reset)
│   ├── (dashboard)/        # Authenticated dashboard pages
│   ├── (public)/           # Public board pages (SSR)
│   ├── api/v1/             # REST API route handlers
│   └── middleware.ts        # Edge middleware (redirects, auth)
├── components/             # Shared React components
│   ├── ui/                 # shadcn/ui base components
│   └── [feature]/          # Feature-specific components
├── lib/                    # Shared utilities and business logic
│   ├── db/                 # Prisma client, queries, migrations
│   ├── auth/               # Auth.js config, helpers
│   ├── cache/              # Redis client, cache helpers
│   ├── analytics/          # Analytics event capture
│   └── validations/        # Zod schemas (shared between API and frontend)
├── types/                  # Shared TypeScript type definitions
└── config/                 # Environment config, constants
```

**File Structure Rules:**
- One exported component per `.tsx` file (named same as file: `link-card.tsx` exports `LinkCard`)
- Barrel exports (`index.ts`) only in `components/ui/` — avoid elsewhere to prevent circular imports
- Prisma schema in `prisma/schema.prisma` at project root
- Environment validation in `config/env.ts`

### Format Patterns

**API Response Formats:**

Success response (single item):
```json
{
  "data": { "id": "abc123", "slug": "my-link", "targetUrl": "https://..." }
}
```

Success response (list):
```json
{
  "data": [{ ... }, { ... }],
  "pagination": { "total": 42, "limit": 20, "offset": 0 }
}
```

Error response:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Custom slug already exists",
    "details": { "field": "slug", "value": "my-link" }
  }
}
```

- All responses wrapped in `{ data }` or `{ error }` — never bare objects
- HTTP status codes: 200 (success), 201 (created), 204 (deleted, no body), 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found), 409 (conflict), 429 (rate limited), 500 (server error)

**Data Exchange Formats:**
- JSON fields: `camelCase` in API responses (JavaScript convention), even though database uses `snake_case`. Prisma handles the mapping.
- Dates: ISO 8601 strings in API responses (`"2026-03-16T02:31:00.000Z"`)
- IDs: UUIDs as strings (`"550e8400-e29b-41d4-a716-446655440000"`)
- Booleans: `true`/`false` (never `1`/`0`)
- Null: explicit `null` for absent optional fields, omit field entirely for undefined
- Pagination: offset-based with `limit` and `offset` query params. Default `limit=20`, max `limit=100`.

### Communication Patterns

**Analytics Event Pattern:**
```typescript
type ClickEvent = {
  linkId: string;
  timestamp: string;       // ISO 8601
  referrer: string | null;
  country: string | null;  // ISO 3166-1 alpha-2
  userAgent: string;
};
```
- Events are fire-and-forget — never awaited in the redirect path
- Events written via `waitUntil()` in edge middleware

**Logging Pattern:**
- Structured JSON logs: `{ level, message, timestamp, requestId, ...context }`
- Log levels: `error` (failures), `warn` (degraded), `info` (business events), `debug` (development only)
- Every API request gets a `requestId` (UUID) passed via header and logged
- Never log: passwords, API keys, full request bodies with sensitive data
- Always log: request method, path, status code, duration, userId (if authenticated)

### Process Patterns

**Error Handling:**
- API routes: try/catch at the route handler level, return structured error response
- Server components: error.tsx boundary files per route segment
- Client components: React error boundaries wrapping feature sections
- Never expose internal error details (stack traces, SQL) to API consumers
- Log full error context server-side, return sanitized message to client
- Custom `AppError` class with `code`, `message`, `statusCode` for business logic errors

**Loading States:**
- Server components: `loading.tsx` files per route segment (Next.js Suspense)
- Client components: `isLoading` boolean state, skeleton UI from shadcn/ui
- API mutations: optimistic updates for instant-feeling UI, revert on error
- Never show raw "Loading..." text — always use skeleton components

**Validation Pattern:**
- Validate at API boundary (route handler) using Zod schemas
- Same Zod schema used for frontend form validation and API validation
- Prisma schema is the database-level constraint (unique, not null, etc.)
- Three layers: Zod (shape), Prisma (persistence), PostgreSQL (integrity)

**Authentication Flow:**
- Session check: Auth.js `auth()` helper in server components and route handlers
- API key check: custom middleware for `/api/v1/*` routes that checks `Authorization` header
- Public routes: no auth check, but rate limited by IP
- Pattern: auth check is the FIRST thing in every protected route handler

### Enforcement Guidelines

**All AI Agents MUST:**
1. Follow the naming conventions above — no exceptions. When in doubt, check existing code for precedent.
2. Use Zod schemas from `lib/validations/` for all API input validation — never validate manually.
3. Return API responses in the standard `{ data }` / `{ error }` wrapper format.
4. Co-locate tests next to source files, not in a separate test directory.
5. Use `@/` import alias for all project imports — never use relative paths that traverse more than one level (`../` is ok, `../../` is not).
6. Handle errors with the `AppError` class for business logic, never throw raw strings or generic Errors.

**Anti-Patterns to Avoid:**
- Do NOT create a `utils.ts` catch-all file — place utilities in domain-specific modules
- Do NOT use `any` type — use `unknown` and narrow, or define proper types
- Do NOT create API endpoints outside `/api/v1/` — all REST endpoints are versioned
- Do NOT import from `prisma/` directly in components — access data through `lib/db/` functions
- Do NOT use `console.log` — use the structured logger from `lib/logger`
- Do NOT store derived state in React — compute it from source data

## Project Structure & Boundaries

### Complete Project Directory Structure

```
linkboard/
├── .env.example                    # Environment variable template
├── .env.local                      # Local development secrets (gitignored)
├── .eslintrc.json                  # ESLint configuration
├── .gitignore
├── .github/
│   └── workflows/
│       ├── ci.yml                  # PR checks: lint, type-check, test
│       └── deploy.yml              # Production deployment
├── Dockerfile                      # Self-hosted deployment
├── docker-compose.yml              # Local dev with PostgreSQL + Redis
├── next.config.ts                  # Next.js configuration
├── package.json
├── pnpm-lock.yaml
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts                # Test configuration
├── prisma/
│   ├── schema.prisma               # Database schema (source of truth)
│   ├── migrations/                 # Version-controlled migrations
│   └── seed.ts                     # Development seed data
├── public/
│   ├── favicon.ico
│   └── og-default.png              # Default Open Graph image
└── src/
    ├── app/
    │   ├── globals.css              # Tailwind base styles
    │   ├── layout.tsx               # Root layout (HTML shell)
    │   ├── not-found.tsx            # 404 page
    │   ├── error.tsx                # Global error boundary
    │   ├── (auth)/
    │   │   ├── layout.tsx           # Auth pages layout (centered, minimal)
    │   │   ├── login/
    │   │   │   └── page.tsx         # Login page (FR23)
    │   │   ├── register/
    │   │   │   └── page.tsx         # Registration page (FR21, FR22)
    │   │   └── reset-password/
    │   │       └── page.tsx         # Password reset (FR24)
    │   ├── (dashboard)/
    │   │   ├── layout.tsx           # Dashboard layout (sidebar nav, auth guard)
    │   │   ├── page.tsx             # Dashboard home (FR31, FR32)
    │   │   ├── links/
    │   │   │   ├── page.tsx         # Link library (FR27, FR28, FR29)
    │   │   │   └── [id]/
    │   │   │       └── page.tsx     # Link detail + analytics (FR16-FR19)
    │   │   ├── boards/
    │   │   │   ├── page.tsx         # Boards list
    │   │   │   ├── new/
    │   │   │   │   └── page.tsx     # Create board (FR8)
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx     # Board detail (FR14)
    │   │   │       ├── edit/
    │   │   │       │   └── page.tsx # Edit board (FR9)
    │   │   │       └── analytics/
    │   │   │           └── page.tsx # Board analytics (FR20)
    │   │   └── settings/
    │   │       ├── page.tsx         # Profile settings (FR25)
    │   │       └── api-keys/
    │   │           └── page.tsx     # API key management (FR26)
    │   ├── (public)/
    │   │   └── b/
    │   │       └── [slug]/
    │   │           └── page.tsx     # Public board view — SSR (FR15, FR40-FR42)
    │   └── api/
    │       └── v1/
    │           ├── links/
    │           │   ├── route.ts     # GET (list), POST (create) — FR34
    │           │   └── [id]/
    │           │       └── route.ts # GET, PATCH, DELETE — FR34
    │           ├── boards/
    │           │   ├── route.ts     # GET (list), POST (create) — FR35
    │           │   └── [id]/
    │           │       ├── route.ts # GET, PATCH, DELETE — FR35
    │           │       └── links/
    │           │           └── route.ts # POST (add), DELETE (remove) — FR36
    │           ├── analytics/
    │           │   ├── links/
    │           │   │   └── [id]/
    │           │   │       └── route.ts # GET link analytics — FR37
    │           │   └── boards/
    │           │       └── [id]/
    │           │           └── route.ts # GET board analytics — FR37
    │           ├── auth/
    │           │   └── [...nextauth]/
    │           │       └── route.ts # Auth.js API routes
    │           └── docs/
    │               └── route.ts     # OpenAPI/Swagger UI — FR39
    ├── components/
    │   ├── ui/                      # shadcn/ui base components
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── dialog.tsx
    │   │   ├── input.tsx
    │   │   ├── skeleton.tsx
    │   │   ├── table.tsx
    │   │   └── ...                  # Other shadcn/ui components as needed
    │   ├── layout/
    │   │   ├── sidebar.tsx          # Dashboard sidebar navigation
    │   │   ├── header.tsx           # Dashboard header
    │   │   └── mobile-nav.tsx       # Mobile bottom navigation
    │   ├── links/
    │   │   ├── link-card.tsx        # Link display card
    │   │   ├── link-card.test.tsx
    │   │   ├── create-link-form.tsx # Link creation form (FR1-FR4, FR30)
    │   │   ├── link-list.tsx        # Paginated link list
    │   │   └── link-filters.tsx     # Search/filter controls (FR28)
    │   ├── boards/
    │   │   ├── board-card.tsx       # Board display card
    │   │   ├── board-form.tsx       # Create/edit board form
    │   │   ├── board-link-list.tsx  # Links within a board (FR14)
    │   │   └── board-share.tsx      # Share controls (visibility)
    │   ├── analytics/
    │   │   ├── click-timeline.tsx   # Click count over time chart (FR17)
    │   │   ├── referrer-chart.tsx   # Top referrers chart (FR18)
    │   │   ├── geo-chart.tsx        # Geographic distribution (FR19)
    │   │   └── stats-summary.tsx    # Summary stats card (FR16)
    │   └── auth/
    │       ├── login-form.tsx       # Login form with OAuth buttons
    │       ├── register-form.tsx    # Registration form
    │       └── oauth-buttons.tsx    # GitHub/Google OAuth buttons
    ├── lib/
    │   ├── db/
    │   │   ├── client.ts            # Prisma client singleton
    │   │   ├── links.ts             # Link CRUD queries
    │   │   ├── links.test.ts
    │   │   ├── boards.ts            # Board CRUD queries
    │   │   ├── boards.test.ts
    │   │   ├── users.ts             # User queries
    │   │   ├── analytics.ts         # Analytics read/write queries
    │   │   └── api-keys.ts          # API key queries
    │   ├── auth/
    │   │   ├── config.ts            # Auth.js configuration
    │   │   ├── api-key.ts           # API key validation middleware
    │   │   ├── api-key.test.ts
    │   │   └── helpers.ts           # Auth utility functions
    │   ├── cache/
    │   │   ├── client.ts            # Redis client (Upstash or ioredis)
    │   │   ├── redirect.ts          # Redirect cache operations
    │   │   ├── redirect.test.ts
    │   │   └── invalidation.ts      # Cache invalidation helpers
    │   ├── analytics/
    │   │   ├── capture.ts           # Event capture (fire-and-forget)
    │   │   └── capture.test.ts
    │   ├── validations/
    │   │   ├── link.ts              # Link Zod schemas (shared API + frontend)
    │   │   ├── board.ts             # Board Zod schemas
    │   │   ├── auth.ts              # Auth Zod schemas
    │   │   └── common.ts            # Shared schemas (pagination, etc.)
    │   ├── errors.ts                # AppError class, error helpers
    │   ├── logger.ts                # Structured logger configuration
    │   ├── rate-limit.ts            # Rate limiting middleware
    │   └── api-response.ts          # Standard API response helpers
    ├── types/
    │   ├── api.ts                   # API request/response types
    │   ├── auth.ts                  # Auth-related types
    │   └── index.ts                 # Re-exported shared types
    ├── config/
    │   └── env.ts                   # Zod-validated environment variables
    └── middleware.ts                 # Edge middleware (redirect engine + auth)
```

### Architectural Boundaries

**API Boundaries:**
- All external API access through `/api/v1/*` route handlers
- Route handlers are thin — they validate input (Zod), call `lib/db/*` functions, and return formatted responses
- No business logic in route handlers — logic lives in `lib/db/*` query functions
- Auth boundary: middleware checks session/API key before route handler executes
- Public boundary: `(public)/*` routes and redirect middleware require no authentication

**Component Boundaries:**
- `components/ui/*` — pure presentational, no data fetching, no business logic
- `components/[feature]/*` — feature-specific, may be client components with local state
- `app/(dashboard)/*` — server components that fetch data and compose feature components
- `app/(public)/*` — server-rendered pages, no client-side JavaScript where possible

**Data Boundaries:**
- `lib/db/*` is the ONLY module that imports Prisma client — all other code accesses data through these functions
- `lib/cache/*` is the ONLY module that imports Redis client
- `lib/validations/*` schemas are shared between API route handlers and frontend forms
- Database → Cache flow: when a link is created/updated, `lib/cache/invalidation.ts` updates Redis

### Requirements to Structure Mapping

**URL Shortening (FR1-FR7):**
- Redirect resolution: `src/middleware.ts` (edge) + `lib/cache/redirect.ts` + `lib/db/links.ts`
- Link CRUD: `app/api/v1/links/` + `lib/db/links.ts` + `lib/validations/link.ts`
- UI: `components/links/*` + `app/(dashboard)/links/*`

**Board Management (FR8-FR15):**
- Board CRUD: `app/api/v1/boards/` + `lib/db/boards.ts` + `lib/validations/board.ts`
- Board-link association: `app/api/v1/boards/[id]/links/` + `lib/db/boards.ts`
- UI: `components/boards/*` + `app/(dashboard)/boards/*`
- Public view: `app/(public)/b/[slug]/page.tsx`

**Link Analytics (FR16-FR20):**
- Event capture: `lib/analytics/capture.ts` (called from `middleware.ts`)
- Analytics queries: `lib/db/analytics.ts`
- Analytics API: `app/api/v1/analytics/*`
- Visualization: `components/analytics/*`

**User Management (FR21-FR26):**
- Auth flows: `lib/auth/*` + `app/api/v1/auth/[...nextauth]/`
- Auth UI: `components/auth/*` + `app/(auth)/*`
- API key management: `lib/auth/api-key.ts` + `lib/db/api-keys.ts` + `app/(dashboard)/settings/api-keys/`

**Dashboard (FR31-FR33):**
- Dashboard page: `app/(dashboard)/page.tsx`
- Navigation: `components/layout/*`

**API Access (FR34-FR39):**
- All endpoints: `app/api/v1/*`
- Rate limiting: `lib/rate-limit.ts`
- Documentation: `app/api/v1/docs/`

**Public Boards (FR40-FR42):**
- SSR rendering: `app/(public)/b/[slug]/page.tsx` with `generateMetadata()` for OG tags
- No auth required, server-rendered for SEO

### Integration Points

**Internal Communication:**
- Frontend → API: SPA dashboard uses `fetch()` to call `/api/v1/*` endpoints (same origin)
- Middleware → Cache: Edge middleware calls Redis for redirect resolution
- Middleware → Analytics: `waitUntil()` fires analytics capture after redirect response
- API routes → Database: Route handlers call `lib/db/*` functions which use Prisma

**External Integrations:**
- OAuth providers: GitHub API, Google OAuth (via Auth.js)
- Redis provider: Upstash REST API (edge-compatible) or ioredis (Node.js)
- PostgreSQL provider: Neon/Vercel Postgres or standard PostgreSQL
- Error tracking: Sentry SDK (optional, added as needed)

**Data Flow — Redirect Path (hot path):**
```
Request: GET /my-slug
→ middleware.ts (edge runtime)
  → lib/cache/redirect.ts (Redis lookup)
    → HIT: return 301 redirect + fire analytics event via waitUntil()
    → MISS: lib/db/links.ts (PostgreSQL lookup)
      → FOUND: populate cache, return 301 redirect + fire analytics event
      → NOT FOUND: pass through to Next.js routing (404)
```

**Data Flow — API Path (standard):**
```
Request: POST /api/v1/links
→ middleware.ts (auth check: session or API key)
  → app/api/v1/links/route.ts
    → Zod validation (lib/validations/link.ts)
    → lib/db/links.ts (Prisma insert)
    → lib/cache/invalidation.ts (populate Redis cache)
    → Return { data: link } with 201 status
```

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** PASS
- Next.js 16 + Prisma 7 + Auth.js v5 + Redis 8 — all actively maintained, all TypeScript-native, all compatible with edge and Node.js runtimes where needed
- Prisma 7's pure TypeScript client works in both Node.js (API routes) and edge (with query limitations). Redirect lookups use Redis in edge middleware, falling back to Prisma only in Node.js runtime — no edge/Prisma conflict
- shadcn/ui CLI v4 + Tailwind CSS v4 + Next.js 16 App Router — explicitly supported combination
- Zod 4 + Prisma 7 — complementary (Zod validates input shapes, Prisma handles persistence types). No overlap or conflict
- Auth.js v5 Prisma adapter works with Prisma 7 for user/session persistence

**Pattern Consistency:** PASS
- Naming conventions (snake_case DB, camelCase API/code, kebab-case files) align with each technology's conventions: Prisma expects snake_case in schema, JavaScript expects camelCase, Next.js expects kebab-case files
- API response wrapper `{ data }` / `{ error }` is enforced at `lib/api-response.ts` — single source of truth for all route handlers
- Co-located test pattern aligns with Vitest's default file discovery

**Structure Alignment:** PASS
- App Router file-system routing maps directly to the defined directory structure
- Route groups `(auth)`, `(dashboard)`, `(public)` create clear boundaries without affecting URL paths
- `lib/` directory structure mirrors the architectural component boundaries (db, auth, cache, analytics, validations)

### Requirements Coverage Validation

**Functional Requirements Coverage:** ALL 42 FRs COVERED

| FR Range | Category | Architectural Support |
|----------|----------|----------------------|
| FR1-FR7 | URL Shortening | `middleware.ts` + `lib/cache/redirect.ts` + `lib/db/links.ts` + `app/api/v1/links/` |
| FR8-FR15 | Board Management | `lib/db/boards.ts` + `app/api/v1/boards/` + `app/(public)/b/[slug]/` |
| FR16-FR20 | Link Analytics | `lib/analytics/capture.ts` + `lib/db/analytics.ts` + `components/analytics/*` |
| FR21-FR26 | User Management | Auth.js v5 + `lib/auth/*` + `app/(auth)/*` + `app/(dashboard)/settings/` |
| FR27-FR30 | Link Library | `app/(dashboard)/links/` + `lib/db/links.ts` + `components/links/*` |
| FR31-FR33 | Dashboard | `app/(dashboard)/page.tsx` + `components/layout/*` |
| FR34-FR39 | API Access | `app/api/v1/*` + Zod validation + rate limiting + OpenAPI docs |
| FR40-FR42 | Public Boards | `app/(public)/b/[slug]/page.tsx` with SSR + `generateMetadata()` for OG tags |

**Non-Functional Requirements Coverage:** ALL 24 NFRs ADDRESSED

| NFR Range | Category | Architectural Support |
|-----------|----------|----------------------|
| NFR1-NFR6 | Performance | Redis caching for redirects, async analytics via `waitUntil()`, SSR for public boards, Turbopack for build speed |
| NFR7-NFR15 | Security | TLS (infrastructure), bcrypt (password hashing), SHA-256 (API key hashing), Auth.js session management, Zod input sanitization, rate limiting middleware, ownership-based authorization |
| NFR16-NFR19 | Scalability | Stateless Next.js instances + Redis shared cache = horizontal scaling. Prisma indexed lookups. Async analytics pipeline. |
| NFR20-NFR24 | Accessibility | shadcn/ui built on Radix UI (WCAG 2.1 AA), Recharts with text alternatives, Tailwind color system with contrast compliance |

### Implementation Readiness Validation

**Decision Completeness:** PASS
- All critical decisions documented with specific versions (Next.js 16.1.6, Prisma 7.x, PostgreSQL 18, Redis 8, Auth.js v5, Zod 4.3.x, Vitest 4.1.x, shadcn/ui CLI v4)
- Each decision includes rationale, affects, and trade-offs
- Implementation sequence defined with 10 ordered steps

**Structure Completeness:** PASS
- Complete file tree with 60+ specific files and directories
- Every file annotated with its purpose and related FRs
- All integration points documented with data flow diagrams

**Pattern Completeness:** PASS
- 6 mandatory enforcement rules for AI agents
- 6 anti-patterns explicitly documented
- Concrete examples for API response formats, error formats, naming conventions
- Authentication flow pattern documented for all three auth mechanisms

### Gap Analysis Results

**No Critical Gaps Found.**

**Important Gaps (addressable during implementation):**
1. **Database schema not defined** — Prisma schema details (exact tables, columns, relations) will be defined during the first implementation epic. The architecture provides enough structure (entity relationships, naming conventions) for agents to derive the schema.
2. **Testing strategy depth** — Vitest + React Testing Library selected, but no specific testing patterns (e.g., API route testing approach, database test isolation). Agents should use Prisma's test client and in-memory SQLite for unit tests, real PostgreSQL for integration.
3. **OpenAPI generation approach** — FR39 requires OpenAPI docs. Exact library (`zod-openapi`, `next-swagger-doc`, etc.) not specified. Agent should evaluate at implementation time.

**Nice-to-Have Gaps (post-MVP):**
- No monitoring/alerting architecture defined beyond Sentry — sufficient for MVP
- No CDN configuration for static assets — Next.js/Vercel handles this automatically
- No database backup strategy — infrastructure concern, not architecture

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High — standard web application patterns with well-proven technology choices. No exotic requirements. The architecture is deliberately boring where it can be, innovative only where the product demands it (the redirect engine in edge middleware).

**Key Strengths:**
- Single codebase (Next.js monolith) minimizes operational complexity for a 2-3 person team
- Edge middleware for redirects achieves the <50ms p99 target without a separate service
- API-first design with one REST surface for both SPA and external consumers
- Every FR and NFR has a clear architectural home — no ambiguity for implementing agents
- Comprehensive consistency patterns prevent AI agents from making conflicting decisions

**Areas for Future Enhancement:**
- Extract analytics pipeline to a message queue when traffic exceeds MVP thresholds
- Add CDN-level redirect caching for top-traffic links at scale
- Introduce team workspaces with RBAC (v2.0 — currently single-user ownership model)
- Custom domain support with automated SSL provisioning (v2.0)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries — especially the data access boundary (`lib/db/*` only)
- Refer to this document for all architectural questions
- When a decision isn't covered, follow the established patterns and conventions

**First Implementation Priority:**
```bash
npx create-next-app@latest linkboard --yes
```
Then: `docker-compose.yml` for local PostgreSQL + Redis, Prisma schema setup, Auth.js configuration.
