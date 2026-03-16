---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
status: complete
completedAt: '2026-03-16'
workflowType: 'create-epics-and-stories'
project_name: 'Linkboard'
date: '2026-03-16'
---

# Linkboard - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Linkboard, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR1: Users can create a short link by providing a target URL
- FR2: Users can specify a custom slug for a short link or have one auto-generated
- FR3: Users can add metadata to a link (title, description, tags)
- FR4: Users can set an optional expiration date/time on a short link
- FR5: Users can update the target URL of an existing short link (redirect preservation)
- FR6: Users can delete a short link permanently
- FR7: Anyone with a short link URL can be redirected to the target destination
- FR8: Users can create a board with a name, description, and visibility setting (public, private, unlisted)
- FR9: Users can edit board metadata (name, description, visibility)
- FR10: Users can delete a board
- FR11: Users can add existing links to a board
- FR12: Users can remove links from a board without deleting the link itself
- FR13: Users can reorder links within a board
- FR14: Users can view all links in a board with their metadata
- FR15: Anyone with a public or unlisted board URL can view the board and its links without authentication
- FR16: Users can view total click count for any of their links
- FR17: Users can view click counts aggregated by time period (daily, weekly, monthly)
- FR18: Users can view top referrer sources for a link
- FR19: Users can view geographic distribution of clicks (country-level) for a link
- FR20: Users can view aggregate analytics for all links in a board (board-level dashboard)
- FR21: Visitors can register an account using email and password
- FR22: Visitors can register and log in using OAuth providers (GitHub, Google)
- FR23: Users can log in and log out of their account
- FR24: Users can reset their password via email
- FR25: Users can view and edit their profile information
- FR26: Users can generate and manage API keys for programmatic access
- FR27: Users can view all their links in a personal link library
- FR28: Users can search and filter links by title, tags, target URL, or board membership
- FR29: Users can view which boards a link belongs to
- FR30: Users can create a link and assign it to a board in a single action
- FR31: Users can view a dashboard showing recent links, boards overview, and quick-create actions
- FR32: Users can access link creation from the dashboard with board assignment
- FR33: Users can navigate between boards, link library, analytics, and account settings
- FR34: API consumers can create, read, update, and delete links via REST API
- FR35: API consumers can create, read, update, and delete boards via REST API
- FR36: API consumers can add and remove links from boards via REST API
- FR37: API consumers can retrieve analytics data for their links and boards via REST API
- FR38: The API enforces rate limiting per API key
- FR39: The API provides OpenAPI/Swagger documentation
- FR40: Public boards render with server-side rendering for SEO crawlability
- FR41: Public boards display Open Graph and Twitter Card meta tags for rich link previews
- FR42: Public boards are accessible without authentication and load performantly on mobile devices

### NonFunctional Requirements

- NFR1: Short link redirects complete in < 50ms at p99 under normal load
- NFR2: API responses return in < 200ms at p95
- NFR3: Dashboard pages reach First Contentful Paint in < 1.5s
- NFR4: Public board pages reach Largest Contentful Paint in < 2.5s
- NFR5: The system supports 100 concurrent authenticated users and 1,000 concurrent redirect requests without performance degradation
- NFR6: Analytics data is eventually consistent — redirect responses are never blocked by analytics writes
- NFR7: All data in transit is encrypted via TLS 1.2+
- NFR8: User passwords are hashed using bcrypt or argon2 (never stored in plaintext)
- NFR9: API keys are hashed at rest and only displayed once at creation time
- NFR10: Session tokens expire after 24 hours of inactivity
- NFR11: All user input is sanitized to prevent XSS, SQL injection, and other injection attacks
- NFR12: Rate limiting is enforced on authentication endpoints (max 10 failed attempts per 15 minutes per IP)
- NFR13: Users can only access, modify, and delete their own links, boards, and analytics data
- NFR14: OAuth tokens are stored securely and refreshed according to provider best practices
- NFR15: Custom slugs are validated to prevent abuse (no reserved words, no misleading slugs)
- NFR16: The redirect engine scales horizontally — adding instances increases redirect throughput linearly
- NFR17: The system supports 1M link redirects per month within the first year without architectural changes
- NFR18: Database queries for redirect resolution use indexed lookups with O(1) complexity
- NFR19: Analytics ingestion pipeline handles traffic spikes of 10x normal volume without data loss
- NFR20: The application meets WCAG 2.1 Level AA compliance across all authenticated views
- NFR21: Public board pages meet WCAG 2.1 Level AA compliance
- NFR22: All interactive elements are keyboard-navigable with visible focus indicators
- NFR23: Analytics charts provide text alternatives for screen reader users
- NFR24: Color is not used as the sole means of conveying information (color contrast ratio minimum 4.5:1 for text)

### Additional Requirements

**From Architecture — Starter Template:**
- Project must be initialized with `npx create-next-app@latest linkboard --yes` (Next.js 16, TypeScript, Tailwind CSS, App Router, Turbopack)
- This initialization should be the FIRST implementation story (Epic 1, Story 1)

**From Architecture — Database & ORM:**
- PostgreSQL 18 with Prisma 7 ORM for all data persistence
- Redis 8 for redirect resolution caching (cache-aside pattern: slug → targetUrl)
- Cache invalidation on link create/update/delete
- Prisma Migrate for version-controlled schema migrations

**From Architecture — Authentication:**
- Auth.js v5 (NextAuth) for session auth (email/password + GitHub/Google OAuth)
- Custom API key auth middleware for `/api/v1/*` routes
- bcrypt (cost factor 12) for password hashing
- SHA-256 hashing for API keys at rest
- Ownership-based authorization (userId on every resource)

**From Architecture — API Design:**
- REST via Next.js Route Handlers under `/api/v1/`
- Zod 4 for runtime schema validation at API boundaries
- Standard response wrapper: `{ data }` / `{ error }` format
- OpenAPI/Swagger documentation at `/api/docs`
- Rate limiting: auth endpoints per IP, API endpoints per API key

**From Architecture — Frontend:**
- shadcn/ui (CLI v4) component library built on Radix UI primitives
- Recharts for analytics visualization
- React Server Components + URL state for state management
- Route groups: `(auth)/`, `(dashboard)/`, `(public)/`, `api/v1/`
- Edge middleware for redirect resolution + auth checks

**From Architecture — Infrastructure:**
- Docker + docker-compose.yml for local dev (PostgreSQL + Redis)
- Vercel (primary) / Docker (self-host) deployment targets
- GitHub Actions CI/CD (lint, type-check, test on PR; deploy on main merge)
- Structured JSON logging (pino or Next.js built-in)
- Sentry for error tracking
- Zod-validated environment variables at startup

**From Architecture — Testing:**
- Vitest 4 + React Testing Library
- Co-located tests (`*.test.ts` / `*.test.tsx` next to source files)

**From Architecture — Implementation Sequence:**
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

**From Architecture — Naming & Structure Conventions:**
- Database: snake_case tables/columns, PascalCase enums, UUID primary keys
- API: plural nouns, kebab-case, PATCH (not PUT), versioned under `/api/v1/`
- Code: kebab-case files, PascalCase components, camelCase functions/variables
- Co-located tests, feature-based organization, `@/` import alias
- `lib/db/*` is the ONLY module that imports Prisma client
- `lib/cache/*` is the ONLY module that imports Redis client

### FR Coverage Map

- FR1: Epic 2 — Create short link
- FR2: Epic 2 — Custom slug / auto-generate
- FR3: Epic 2 — Link metadata (title, description, tags)
- FR4: Epic 2 — Link expiration
- FR5: Epic 2 — Update target URL
- FR6: Epic 2 — Delete link
- FR7: Epic 2 — Redirect resolution
- FR8: Epic 3 — Create board with visibility
- FR9: Epic 3 — Edit board metadata
- FR10: Epic 3 — Delete board
- FR11: Epic 3 — Add links to board
- FR12: Epic 3 — Remove links from board
- FR13: Epic 3 — Reorder links in board
- FR14: Epic 3 — View board with link metadata
- FR15: Epic 5 — Public/unlisted board viewing
- FR16: Epic 6 — Total click count
- FR17: Epic 6 — Time-period aggregated clicks
- FR18: Epic 6 — Top referrer sources
- FR19: Epic 6 — Geographic click distribution
- FR20: Epic 6 — Board-level aggregate analytics
- FR21: Epic 1 — Email/password registration
- FR22: Epic 1 — OAuth registration/login
- FR23: Epic 1 — Login/logout
- FR24: Epic 1 — Password reset
- FR25: Epic 1 — Profile management
- FR26: Epic 7 — API key generation/management
- FR27: Epic 2 — Link library view
- FR28: Epic 2 — Link search/filter
- FR29: Epic 2 — View link board membership
- FR30: Epic 2 — Create link with board assignment
- FR31: Epic 4 — Dashboard overview
- FR32: Epic 4 — Dashboard link creation
- FR33: Epic 4 — Navigation between sections
- FR34: Epic 7 — Links REST API
- FR35: Epic 7 — Boards REST API
- FR36: Epic 7 — Board-links REST API
- FR37: Epic 7 — Analytics REST API
- FR38: Epic 7 — API rate limiting
- FR39: Epic 7 — OpenAPI documentation
- FR40: Epic 5 — Public board SSR
- FR41: Epic 5 — OG/Twitter meta tags
- FR42: Epic 5 — Public board mobile performance

## Epic List

### Epic 1: Project Foundation & User Authentication
Users can register an account (email/password or GitHub/Google OAuth), log in, log out, reset their password, and manage their profile. This epic also bootstraps the project (Next.js 16 init, database schema, Docker dev environment, Auth.js configuration) — establishing the identity and infrastructure layer that all subsequent epics build upon.
**FRs covered:** FR21, FR22, FR23, FR24, FR25
**NFRs addressed:** NFR7, NFR8, NFR10, NFR11, NFR12, NFR13, NFR14

### Epic 2: Link Management & URL Shortening
Users can create short links with custom or auto-generated slugs, add metadata (title, description, tags), set expiration dates, update target URLs, and delete links. The redirect engine resolves short URLs via Redis cache with database fallback. Users can browse their personal link library with search, filter, and board membership views.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR27, FR28, FR29, FR30
**NFRs addressed:** NFR1, NFR5, NFR6, NFR15, NFR16, NFR17, NFR18

### Epic 3: Board Organization
Users can create boards with visibility controls (public, private, unlisted), edit board metadata, add/remove links without deleting them, reorder links within boards, and view organized link collections with full metadata. The board metaphor is the core product differentiator.
**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13, FR14
**NFRs addressed:** NFR11, NFR13, NFR20, NFR22

### Epic 4: Dashboard & Navigation
Users get a home base showing recent links, boards overview, and quick-create actions. Seamless navigation between boards, link library, analytics, and settings. The dashboard ties all features into a cohesive experience.
**FRs covered:** FR31, FR32, FR33
**NFRs addressed:** NFR3, NFR20, NFR22

### Epic 5: Public Board Experience
Anyone with a public or unlisted board URL can view the board and its links without authentication. Pages are server-side rendered for SEO, include Open Graph and Twitter Card meta tags for rich social previews, and are mobile-optimized with fast load times.
**FRs covered:** FR15, FR40, FR41, FR42
**NFRs addressed:** NFR4, NFR21, NFR22, NFR24

### Epic 6: Link Analytics
Users can view total click counts, time-series trends (daily/weekly/monthly), top referrer sources, geographic distribution (country-level), and board-level aggregate analytics dashboards. Analytics events are captured asynchronously during redirects without blocking the response.
**FRs covered:** FR16, FR17, FR18, FR19, FR20
**NFRs addressed:** NFR6, NFR19, NFR23

### Epic 7: API Access & Developer Experience
Developers can generate and manage API keys, then use them to programmatically create/read/update/delete links and boards, manage board membership, and retrieve analytics — all via a versioned REST API with rate limiting and OpenAPI/Swagger documentation.
**FRs covered:** FR26, FR34, FR35, FR36, FR37, FR38, FR39
**NFRs addressed:** NFR2, NFR9, NFR11

---

## Epic 1: Project Foundation & User Authentication

Users can register an account (email/password or GitHub/Google OAuth), log in, log out, reset their password, and manage their profile. This epic bootstraps the project and establishes the identity layer all subsequent epics build upon.

### Story 1.1: Project Initialization and Dev Environment

As a developer,
I want the Next.js 16 project initialized with Docker-based PostgreSQL and Redis,
So that I have a working development environment to build all features upon.

**Acceptance Criteria:**

**Given** no project exists yet
**When** the project is initialized with `npx create-next-app@latest linkboard --yes`
**Then** a Next.js 16 project is created with TypeScript, Tailwind CSS v4, ESLint, App Router, and Turbopack
**And** a `docker-compose.yml` provides PostgreSQL 18 and Redis 8 for local development
**And** a `.env.example` documents all required environment variables
**And** `config/env.ts` validates environment variables with Zod at startup, failing fast if config is missing
**And** `lib/logger.ts` provides structured JSON logging (no `console.log`)
**And** `lib/errors.ts` defines the `AppError` class with `code`, `message`, and `statusCode`
**And** `lib/api-response.ts` provides standard `{ data }` / `{ error }` response helpers
**And** Vitest 4 is configured with co-located test support (`*.test.ts` / `*.test.tsx`)
**And** the `@/` import alias is configured for all project imports
**And** the project builds and the dev server starts without errors

### Story 1.2: Database Schema and Prisma Setup for Users

As a developer,
I want the Prisma 7 ORM configured with the users table and Auth.js adapter tables,
So that user data can be persisted and Auth.js can manage sessions.

**Acceptance Criteria:**

**Given** the project is initialized with Docker PostgreSQL running
**When** Prisma 7 is installed and configured
**Then** `prisma/schema.prisma` defines the `users` table with `id` (UUID), `name`, `email` (unique), `email_verified`, `image`, `password_hash`, `created_at`, `updated_at` columns using snake_case naming
**And** Auth.js adapter tables (`accounts`, `sessions`, `verification_tokens`) are defined per Auth.js Prisma adapter requirements
**And** `lib/db/client.ts` exports a Prisma client singleton
**And** `lib/db/users.ts` provides user query functions (the only module importing Prisma for user operations)
**And** an initial migration is generated and applies successfully against the Docker PostgreSQL instance
**And** `prisma/seed.ts` creates a test user for development
**And** all database naming follows snake_case conventions with UUID primary keys

### Story 1.3: Email/Password Registration

As a visitor,
I want to register an account using my email and password,
So that I can access Linkboard's features.

**Acceptance Criteria:**

**Given** I am an unauthenticated visitor on the registration page
**When** I submit a valid email and password (minimum 8 characters)
**Then** a new user account is created with the password hashed using bcrypt (cost factor 12)
**And** I am automatically logged in and redirected to the dashboard
**And** the password is never stored in plaintext (NFR8)

**Given** I submit a registration form with an email that already exists
**When** the server processes the request
**Then** I see a clear error message that the email is already registered
**And** no duplicate account is created

**Given** I submit invalid input (missing email, weak password, malformed email)
**When** the form is submitted
**Then** Zod validation catches the error and displays specific field-level error messages
**And** all input is sanitized to prevent XSS and injection (NFR11)

### Story 1.4: Email/Password Login and Session Management

As a registered user,
I want to log in with my email and password and log out,
So that I can securely access my account.

**Acceptance Criteria:**

**Given** I am on the login page with valid credentials
**When** I submit my email and password
**Then** Auth.js validates my credentials, creates a JWT session in an HTTP-only cookie, and redirects me to the dashboard
**And** the session expires after 24 hours of inactivity (NFR10)

**Given** I am logged in
**When** I click the logout button
**Then** my session is destroyed and I am redirected to the login page

**Given** I submit incorrect credentials
**When** the server processes the login request
**Then** I see a generic error message ("Invalid email or password" — no information leakage)
**And** rate limiting is enforced (max 10 failed attempts per 15 minutes per IP) (NFR12)

**Given** I am unauthenticated and try to access a dashboard page
**When** the middleware checks my session
**Then** I am redirected to the login page

### Story 1.5: OAuth Login (GitHub and Google)

As a visitor,
I want to register and log in using my GitHub or Google account,
So that I can access Linkboard without creating a new password.

**Acceptance Criteria:**

**Given** I am on the login or registration page
**When** I click "Continue with GitHub" or "Continue with Google"
**Then** I am redirected to the OAuth provider's authorization page
**And** upon successful authorization, an account is created (or linked if email matches) and I am logged in
**And** OAuth tokens are stored securely via Auth.js Prisma adapter (NFR14)

**Given** I previously registered with email/password and now try OAuth with the same email
**When** the OAuth flow completes
**Then** the OAuth account is linked to my existing account (no duplicate)

**Given** the OAuth provider is unavailable or I deny authorization
**When** the callback is processed
**Then** I am redirected to the login page with a clear error message

### Story 1.6: Password Reset via Email

As a registered user,
I want to reset my password via email,
So that I can regain access if I forget my password.

**Acceptance Criteria:**

**Given** I am on the password reset page
**When** I enter my registered email address
**Then** a password reset email is sent with a secure, time-limited token
**And** I see a confirmation message regardless of whether the email exists (no user enumeration)

**Given** I have a valid reset token
**When** I submit a new password (minimum 8 characters)
**Then** my password is updated (hashed with bcrypt, cost factor 12) and all existing sessions are invalidated
**And** I am redirected to the login page with a success message

**Given** I have an expired or invalid reset token
**When** I try to use it
**Then** I see an error message and am prompted to request a new reset

### Story 1.7: User Profile Management

As a logged-in user,
I want to view and edit my profile information,
So that I can keep my account details up to date.

**Acceptance Criteria:**

**Given** I am logged in and navigate to the settings page
**When** the page loads
**Then** I see my current profile information (name, email, profile image)
**And** the page is accessible (keyboard-navigable, visible focus indicators) (NFR20, NFR22)

**Given** I edit my name and submit
**When** the update is processed
**Then** my profile is updated and I see a success confirmation
**And** only I can modify my own profile (NFR13)

**Given** I submit invalid profile data
**When** the server validates the input
**Then** Zod validation returns specific field-level error messages

---

## Epic 2: Link Management & URL Shortening

Users can create short links with custom or auto-generated slugs, add metadata, set expiration dates, update target URLs, and delete links. The redirect engine resolves short URLs instantly. Users can browse their personal link library with search and filter.

### Story 2.1: Create Short Links with Auto-Generated Slugs

As a logged-in user,
I want to create a short link by providing a target URL,
So that I can share a shorter, memorable URL.

**Acceptance Criteria:**

**Given** I am logged in and on the link creation form
**When** I submit a valid target URL
**Then** a short link is created with an auto-generated unique slug (e.g., `lnkb.rd/a3Kx9`)
**And** the link is stored in the `links` table with `id` (UUID), `slug` (unique, indexed), `target_url`, `user_id`, `created_at`, `updated_at`
**And** the Prisma migration creates the `links` table if it doesn't exist
**And** the `links` database table uses indexed lookups on `slug` for O(1) redirect resolution (NFR18)
**And** I see the created short link with a copy-to-clipboard action
**And** the API response follows the `{ data: link }` wrapper format

**Given** I submit an invalid URL (not a valid http/https URL)
**When** the form is submitted
**Then** Zod validation rejects it with a clear error message

**Given** I am not authenticated
**When** I try to create a link
**Then** I receive a 401 error

### Story 2.2: Custom Slug Support and Validation

As a logged-in user,
I want to specify a custom slug for my short link,
So that I can create branded, memorable URLs.

**Acceptance Criteria:**

**Given** I am creating a new link
**When** I provide a custom slug (e.g., `q2-webinar`)
**Then** the short link is created with my chosen slug if it's available
**And** the slug is validated: alphanumeric + hyphens, 3-50 characters, no reserved words (NFR15)

**Given** I provide a custom slug that already exists
**When** I submit the form
**Then** I see a 409 Conflict error: "Custom slug already exists"

**Given** I provide a slug using reserved words (e.g., `api`, `admin`, `login`, `b`)
**When** the server validates the slug
**Then** I see an error that the slug is reserved and cannot be used

### Story 2.3: Link Metadata Management

As a logged-in user,
I want to add a title, description, and tags to my links,
So that I can organize and identify my links easily.

**Acceptance Criteria:**

**Given** I am creating or editing a link
**When** I provide a title, description, and/or tags
**Then** the metadata is saved with the link (title: string, description: text, tags: string array)
**And** all metadata fields are optional — a link can be created with just a target URL

**Given** I view my link in the link library
**When** the link has metadata
**Then** the title, description, and tags are displayed on the link card

### Story 2.4: Link Expiration

As a logged-in user,
I want to set an optional expiration date/time on my short link,
So that temporary links automatically stop working after their intended use period.

**Acceptance Criteria:**

**Given** I am creating or editing a link
**When** I set an expiration date/time
**Then** the `expires_at` timestamp is saved on the link record

**Given** a link has expired (current time > `expires_at`)
**When** someone tries to access the short URL
**Then** they see a "This link has expired" page instead of being redirected
**And** the expired link still appears in my link library with an "expired" indicator

**Given** I do not set an expiration
**When** I create the link
**Then** the link never expires (`expires_at` is null)

### Story 2.5: Update Link Target URL

As a logged-in user,
I want to update the target URL of an existing short link,
So that my shared short URL points to a new destination without breaking.

**Acceptance Criteria:**

**Given** I own a short link
**When** I update its target URL to a new valid URL
**Then** the target URL is updated in the database
**And** the Redis cache is invalidated for this slug so the redirect picks up the new target
**And** the short link slug remains the same (redirect preservation)

**Given** I try to update a link I don't own
**When** the server processes the request
**Then** I receive a 404 error (not 403 — don't leak existence) (NFR13)

### Story 2.6: Delete Links

As a logged-in user,
I want to permanently delete a short link,
So that I can remove links I no longer need.

**Acceptance Criteria:**

**Given** I own a short link
**When** I delete it
**Then** the link is permanently removed from the database
**And** the Redis cache entry for this slug is invalidated
**And** the short URL returns a 404 page for anyone who tries to access it
**And** the link is removed from all boards it belonged to

**Given** I try to delete a link I don't own
**When** the server processes the request
**Then** I receive a 404 error (NFR13)

### Story 2.7: Redirect Engine with Redis Caching

As anyone with a short link URL,
I want to be redirected to the target destination instantly,
So that the short link is seamless and fast.

**Acceptance Criteria:**

**Given** a valid short link slug exists
**When** a request hits `/{slug}`
**Then** the edge middleware checks Redis for `slug:{slug}` → `{targetUrl, linkId, expiresAt}`
**And** on cache HIT: returns a 301 redirect to the target URL in < 50ms at p99 (NFR1)
**And** on cache MISS: queries PostgreSQL via indexed lookup, populates Redis cache, then returns 301 redirect

**Given** the slug does not exist in cache or database
**When** a request hits `/{slug}`
**Then** the request passes through to Next.js routing (404 page)

**Given** a link exists but has expired
**When** a request hits `/{slug}`
**Then** the redirect is not performed — an "expired" page is shown instead

**Given** a link target URL is updated
**When** the next redirect request comes for that slug
**Then** the stale cache is invalidated and the new target URL is served

**And** redirect responses never block on analytics writes (NFR6)
**And** the redirect engine operates statelessly for horizontal scaling (NFR16)

### Story 2.8: Link Library with Search and Filter

As a logged-in user,
I want to browse all my links with search and filtering,
So that I can quickly find any link I've created.

**Acceptance Criteria:**

**Given** I am logged in and navigate to the link library page
**When** the page loads
**Then** I see a paginated list of all my links (default 20 per page, max 100) with title, slug, target URL, click count, and tags
**And** I can see which boards each link belongs to (FR29)

**Given** I type in the search box
**When** I submit a search query
**Then** links are filtered by title, tags, target URL, or slug (FR28)
**And** search uses URL query parameters for shareable/bookmarkable URLs

**Given** I select a board filter
**When** the filter is applied
**Then** only links belonging to that board are shown

**And** the link library is accessible with keyboard navigation and visible focus indicators (NFR20, NFR22)

### Story 2.9: Create Link with Board Assignment

As a logged-in user,
I want to create a link and assign it to a board in one action,
So that I can organize links into boards without extra steps.

**Acceptance Criteria:**

**Given** I am on the link creation form
**When** I provide a target URL and select a board from a dropdown of my boards
**Then** the link is created AND added to the selected board in a single operation
**And** if the board doesn't exist yet, I only assign to existing boards (board creation is a separate action in Epic 3)

**Given** I create a link without selecting a board
**When** I submit the form
**Then** the link is created in my link library without any board assignment

---

## Epic 3: Board Organization

Users can create boards with visibility controls, manage board membership, reorder links, and view organized link collections. The board metaphor is Linkboard's core differentiator.

### Story 3.1: Create Boards with Visibility Controls

As a logged-in user,
I want to create a board with a name, description, and visibility setting,
So that I can organize my links into themed, shareable collections.

**Acceptance Criteria:**

**Given** I am logged in
**When** I submit the board creation form with a name, optional description, and visibility (public, private, unlisted)
**Then** a board is created in the `boards` table with `id` (UUID), `name`, `slug` (unique, auto-generated from name), `description`, `visibility` (enum: `Public`, `Private`, `Unlisted`), `user_id`, `created_at`, `updated_at`
**And** the Prisma migration creates the `boards` and `board_links` (join table) if they don't exist
**And** the `board_links` table has `board_id`, `link_id`, `position` (integer for ordering), `added_at`
**And** I am redirected to the new board's detail page

**Given** I set visibility to "private"
**When** the board is created
**Then** only I can see and access this board

**Given** I set visibility to "public" or "unlisted"
**When** the board is created
**Then** a shareable board URL is available (e.g., `/b/{board-slug}`)

### Story 3.2: Edit and Delete Boards

As a logged-in user,
I want to edit board metadata and delete boards,
So that I can keep my boards up to date or remove ones I no longer need.

**Acceptance Criteria:**

**Given** I own a board
**When** I edit the name, description, or visibility
**Then** the board is updated and I see a success confirmation
**And** changing visibility from public to private immediately restricts access

**Given** I own a board
**When** I delete it
**Then** the board is permanently removed
**And** links that were in the board are NOT deleted — they remain in my link library
**And** the `board_links` entries for this board are removed

**Given** I try to edit or delete a board I don't own
**When** the server processes the request
**Then** I receive a 404 error (NFR13)

### Story 3.3: Add and Remove Links from Boards

As a logged-in user,
I want to add existing links to a board and remove them,
So that I can curate link collections without affecting the links themselves.

**Acceptance Criteria:**

**Given** I own a board and have links in my library
**When** I add a link to the board
**Then** a `board_links` entry is created linking the board and link
**And** the link appears in the board's link list at the last position

**Given** I remove a link from a board
**When** the operation completes
**Then** the `board_links` entry is removed
**And** the link still exists in my link library — it is NOT deleted (FR12)
**And** the remaining links' positions are recomputed to eliminate gaps

**Given** I try to add a link to a board I don't own
**When** the server processes the request
**Then** I receive a 404 error

**Given** I try to add the same link to a board twice
**When** the server processes the request
**Then** I receive a 409 Conflict error

### Story 3.4: Reorder Links Within a Board

As a logged-in user,
I want to reorder links within a board,
So that I can arrange my curated collection in the most useful order.

**Acceptance Criteria:**

**Given** I own a board with multiple links
**When** I drag a link to a new position (or use move up/down controls)
**Then** the `position` values in `board_links` are updated to reflect the new order
**And** the board displays links in the updated order

**Given** I reorder links
**When** I refresh the page
**Then** the new order is persisted and displayed correctly

### Story 3.5: Board Detail View with Link Metadata

As a logged-in user,
I want to view all links in a board with their full metadata,
So that I can see my organized collection at a glance.

**Acceptance Criteria:**

**Given** I navigate to one of my boards
**When** the page loads
**Then** I see the board name, description, visibility badge, and all links in order
**And** each link shows its title (or slug if no title), target URL, tags, click count, and expiration status
**And** I can add links, remove links, and reorder from this view
**And** the view is accessible (keyboard-navigable, visible focus indicators) (NFR20, NFR22)

---

## Epic 4: Dashboard & Navigation

Users get a home base showing recent activity and quick actions, with seamless navigation across all features.

### Story 4.1: Dashboard Layout and Sidebar Navigation

As a logged-in user,
I want a consistent navigation layout with sidebar (desktop) and bottom nav (mobile),
So that I can move between boards, link library, analytics, and settings seamlessly.

**Acceptance Criteria:**

**Given** I am logged in on a desktop browser (1024px+)
**When** any dashboard page loads
**Then** I see a sidebar navigation with links to: Dashboard, Links, Boards, Analytics, Settings
**And** the current page is highlighted in the navigation

**Given** I am on a mobile device (< 768px)
**When** any dashboard page loads
**Then** I see a bottom navigation bar with the same navigation items
**And** touch targets are appropriately sized for mobile interaction

**Given** I am on a tablet (768px-1023px)
**When** any dashboard page loads
**Then** the sidebar is collapsed but expandable

**And** all navigation elements are keyboard-navigable with visible focus indicators (NFR22)
**And** the dashboard reaches First Contentful Paint in < 1.5s (NFR3)

### Story 4.2: Dashboard Home with Overview and Quick Actions

As a logged-in user,
I want a dashboard home page showing recent links, boards overview, and quick-create actions,
So that I can see my activity at a glance and take action quickly.

**Acceptance Criteria:**

**Given** I am logged in and on the dashboard home page
**When** the page loads
**Then** I see my 5 most recent links with click counts
**And** I see my boards listed with link counts
**And** I see quick-action buttons for "Create Link" and "Create Board"

**Given** I am a new user with no links or boards
**When** the dashboard loads
**Then** I see an empty state with guidance to create my first board with links

**Given** I click "Create Link" from the dashboard
**When** the link creation form opens
**Then** I can create a link with optional board assignment (FR32)

---

## Epic 5: Public Board Experience

Anyone can view public/unlisted boards via server-rendered pages with rich social previews, optimized for mobile.

### Story 5.1: Public Board Server-Side Rendering

As anyone with a public or unlisted board URL,
I want to view the board and its links without logging in,
So that shared boards are accessible to all audiences.

**Acceptance Criteria:**

**Given** a board has visibility set to "public" or "unlisted"
**When** I visit `/b/{board-slug}` without authentication
**Then** the page is fully server-side rendered (SSR) — the HTML response contains all board content for SEO crawlability (FR40)
**And** I see the board name, description, and all links with titles, descriptions, and target URLs
**And** each link is clickable and redirects via the short URL
**And** the page does NOT require JavaScript to display content

**Given** a board has visibility set to "private"
**When** I visit `/b/{board-slug}` without authentication
**Then** I see a 404 page (don't reveal existence)

**Given** the board slug doesn't exist
**When** I visit `/b/{nonexistent-slug}`
**Then** I see a 404 page

### Story 5.2: Open Graph and Twitter Card Meta Tags

As a user sharing a public board on social media,
I want rich link previews with title, description, and image,
So that my shared boards look professional and attract clicks.

**Acceptance Criteria:**

**Given** a public board exists
**When** the SSR page is rendered
**Then** `generateMetadata()` produces Open Graph meta tags: `og:title` (board name), `og:description` (board description), `og:image` (default OG image), `og:url` (canonical board URL)
**And** Twitter Card meta tags: `twitter:card` (summary_large_image), `twitter:title`, `twitter:description`
**And** short link redirect pages include `noindex, nofollow` meta tags (they should NOT be indexed)

**Given** a social media crawler (Facebook, Twitter, Slack) fetches the board URL
**When** the response is parsed
**Then** the rich preview displays correctly with the board's title and description

### Story 5.3: Mobile-Optimized Public Board Layout

As a mobile user viewing a shared board link,
I want a fast, clean, responsive layout,
So that the board is readable and usable on my phone.

**Acceptance Criteria:**

**Given** I visit a public board on a mobile device (< 768px)
**When** the page loads
**Then** links are displayed in a single-column layout with appropriate spacing
**And** the Largest Contentful Paint is < 2.5s (NFR4)
**And** touch targets are appropriately sized
**And** the page meets WCAG 2.1 Level AA compliance (NFR21)

**Given** a public board has many links (50+)
**When** I scroll the page
**Then** the page remains performant with no jank or excessive memory usage

**And** the page is fully accessible: keyboard-navigable, screen-reader compatible, color contrast minimum 4.5:1 (NFR22, NFR24)

---

## Epic 6: Link Analytics

Users can view click analytics at the link and board level, with async event capture that never blocks redirects.

### Story 6.1: Click Event Capture During Redirects

As the system,
I want to capture click events asynchronously during redirects,
So that analytics data is collected without impacting redirect performance.

**Acceptance Criteria:**

**Given** a redirect is processed in edge middleware
**When** the 301 response is sent
**Then** a click event is captured via `waitUntil()` AFTER the redirect response (never blocking it) (NFR6)
**And** the click event includes: `link_id`, `clicked_at` (timestamp), `referrer` (from header), `country` (from geo IP or header), `user_agent`
**And** the `click_events` table is created with appropriate columns and an index on `(link_id, clicked_at)` for time-range queries
**And** the Prisma migration creates the `click_events` table

**Given** the analytics write fails (database error)
**When** the redirect is already sent
**Then** the redirect is NOT affected — the error is logged but the user experience is uninterrupted

**Given** a traffic spike of 10x normal volume
**When** click events flood in
**Then** events are still captured without data loss (NFR19)

### Story 6.2: Link Analytics Dashboard — Clicks and Trends

As a logged-in user,
I want to view total click counts and time-series trends for my links,
So that I can understand how my links are performing over time.

**Acceptance Criteria:**

**Given** I navigate to a link's detail/analytics page
**When** the page loads
**Then** I see the total click count for the link (FR16)
**And** I see a time-series chart (Recharts) showing clicks over time with toggleable aggregation: daily, weekly, monthly (FR17)
**And** the chart provides text alternatives for screen readers (NFR23)

**Given** a link has no clicks yet
**When** I view its analytics
**Then** I see a zero-state with "No clicks yet" and the time-series chart is empty

**Given** I only own this link
**When** analytics data is queried
**Then** only click events for my links are returned (NFR13)

### Story 6.3: Referrer and Geographic Analytics

As a logged-in user,
I want to view top referrer sources and geographic distribution for my links,
So that I know where my traffic is coming from.

**Acceptance Criteria:**

**Given** I am viewing a link's analytics page
**When** I scroll to the referrer section
**Then** I see a chart/list showing the top referrer domains ranked by click count (FR18)
**And** referrers are grouped by domain (e.g., "twitter.com", "google.com", "direct")

**Given** I scroll to the geographic section
**When** the data loads
**Then** I see a chart/table showing click distribution by country (ISO 3166-1) (FR19)

**And** all charts provide text alternatives for screen readers (NFR23)
**And** color is not the sole means of conveying information in charts (NFR24)

### Story 6.4: Board-Level Aggregate Analytics

As a logged-in user,
I want to view aggregate analytics for all links in a board,
So that I can assess the performance of my curated collection as a whole.

**Acceptance Criteria:**

**Given** I navigate to a board's analytics page
**When** the page loads
**Then** I see aggregate metrics: total clicks across all board links, top-performing links, referrer breakdown, and geographic distribution (FR20)
**And** each link in the board shows its individual click count for comparison

**Given** a board has no links or no clicks
**When** I view the board analytics
**Then** I see an appropriate empty state

---

## Epic 7: API Access & Developer Experience

Developers can generate API keys and use them to manage links, boards, and analytics programmatically via a versioned REST API.

### Story 7.1: API Key Generation and Management

As a logged-in user,
I want to generate and manage API keys,
So that I can integrate Linkboard into my automated workflows.

**Acceptance Criteria:**

**Given** I am logged in and on the API keys settings page
**When** I click "Generate New API Key" and provide a name/label
**Then** an API key is generated and displayed ONCE (it will never be shown again)
**And** the API key is hashed with SHA-256 before storage (NFR9)
**And** the `api_keys` table stores `id`, `user_id`, `name`, `key_hash`, `key_prefix` (first 8 chars for identification), `created_at`, `last_used_at`

**Given** I have existing API keys
**When** I view the API keys page
**Then** I see a list of keys with their names, prefixes, creation dates, and last used dates
**And** I can delete any of my keys

**Given** I delete an API key
**When** the deletion is confirmed
**Then** the key is permanently removed and any requests using it immediately fail with 401

### Story 7.2: Links REST API Endpoints

As an API consumer,
I want to create, read, update, and delete links via REST API,
So that I can manage links programmatically.

**Acceptance Criteria:**

**Given** I have a valid API key in the `Authorization: Bearer <key>` header
**When** I `POST /api/v1/links` with `{ targetUrl, slug?, title?, description?, tags?, expiresAt?, boardId? }`
**Then** a link is created and returned as `{ data: link }` with 201 status

**Given** I have a valid API key
**When** I `GET /api/v1/links` with optional query params `?sortBy=createdAt&limit=20&offset=0&search=query`
**Then** I receive `{ data: [...links], pagination: { total, limit, offset } }` with 200 status
**And** only my own links are returned (NFR13)

**Given** I have a valid API key
**When** I `GET /api/v1/links/{id}`
**Then** I receive the link details if I own it, or 404 if not

**Given** I have a valid API key
**When** I `PATCH /api/v1/links/{id}` with updated fields
**Then** the link is partially updated, cache invalidated, and returned with 200 status

**Given** I have a valid API key
**When** I `DELETE /api/v1/links/{id}`
**Then** the link is deleted, cache invalidated, and 204 (no body) is returned

**And** all API responses return in < 200ms at p95 (NFR2)
**And** all input is validated with Zod schemas (NFR11)
**And** invalid API keys return 401 `{ error: { code: "UNAUTHORIZED" } }`

### Story 7.3: Boards and Board-Links REST API Endpoints

As an API consumer,
I want to manage boards and board membership via REST API,
So that I can organize links programmatically.

**Acceptance Criteria:**

**Given** I have a valid API key
**When** I `POST /api/v1/boards` with `{ name, description?, visibility }`
**Then** a board is created and returned with 201 status

**Given** I have a valid API key
**When** I `GET /api/v1/boards`
**Then** I receive a paginated list of my boards

**Given** I have a valid API key
**When** I `PATCH /api/v1/boards/{id}` with updated fields
**Then** the board is updated and returned with 200 status

**Given** I have a valid API key
**When** I `DELETE /api/v1/boards/{id}`
**Then** the board is deleted (links preserved) and 204 is returned

**Given** I have a valid API key
**When** I `POST /api/v1/boards/{id}/links` with `{ linkId }`
**Then** the link is added to the board (FR36)

**Given** I have a valid API key
**When** I `DELETE /api/v1/boards/{id}/links` with `{ linkId }`
**Then** the link is removed from the board without deleting it (FR36)

### Story 7.4: Analytics REST API Endpoints

As an API consumer,
I want to retrieve analytics data via REST API,
So that I can build custom reports and dashboards.

**Acceptance Criteria:**

**Given** I have a valid API key
**When** I `GET /api/v1/analytics/links/{id}?period=daily&from=2026-03-01&to=2026-03-16`
**Then** I receive click analytics for that link: total clicks, time-series data, top referrers, and geo breakdown (FR37)
**And** only analytics for my own links are returned (NFR13)

**Given** I have a valid API key
**When** I `GET /api/v1/analytics/boards/{id}`
**Then** I receive aggregate analytics for all links in that board (FR37)

**Given** the link or board doesn't exist or I don't own it
**When** I request analytics
**Then** I receive 404

### Story 7.5: API Rate Limiting

As the system,
I want to enforce rate limiting on API endpoints,
So that no single consumer can overwhelm the service.

**Acceptance Criteria:**

**Given** an API consumer is making requests with a valid API key
**When** they exceed the rate limit (e.g., 100 requests per minute per key)
**Then** subsequent requests receive 429 `{ error: { code: "RATE_LIMITED", message: "Too many requests", details: { retryAfter: seconds } } }`
**And** the `Retry-After` header is set (FR38)

**Given** rate limiting uses Redis for distributed tracking
**When** multiple application instances are running
**Then** rate limits are enforced consistently across instances

### Story 7.6: OpenAPI Documentation

As an API consumer,
I want to access interactive API documentation,
So that I can understand and test all available endpoints.

**Acceptance Criteria:**

**Given** I navigate to `/api/docs`
**When** the page loads
**Then** I see a Swagger UI displaying all `/api/v1/*` endpoints with request/response schemas (FR39)
**And** the schemas are auto-generated from the Zod validation schemas used in the route handlers
**And** I can try out endpoints directly from the documentation interface
**And** authentication requirements are documented (API key via Bearer token)




---

## Heartbeat Validation Reconciliation — 2026-03-16 05:00 UTC

Validated from completed ACP output that `create-epics-and-stories` finished with:
- 7 epics
- 28 stories
- full FR coverage check recorded by the ACP run
- output file ready for implementation planning

This section was added by heartbeat to reconcile BMAD step state with the already-generated artifact.
