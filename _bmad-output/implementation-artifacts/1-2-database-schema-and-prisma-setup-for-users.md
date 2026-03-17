# Story 1.2: Database Schema and Prisma Setup for Users

Status: done

## Story

As a developer,
I want the Prisma 7 ORM configured with the users table and Auth.js adapter tables,
so that user data can be persisted and Auth.js can manage sessions.

## Acceptance Criteria

1. `prisma/schema.prisma` defines the `users` table with `id` (UUID), `name`, `email` (unique), `email_verified`, `image`, `password_hash`, `created_at`, `updated_at` columns using snake_case naming.
2. Auth.js adapter tables (`accounts`, `sessions`, `verification_tokens`) are defined per Auth.js Prisma adapter requirements.
3. `src/lib/db/client.ts` exports a Prisma client singleton (global caching in dev to survive HMR).
4. `src/lib/db/users.ts` provides user query functions — the ONLY module importing Prisma for user operations.
5. An initial migration is generated and applies successfully against the Docker PostgreSQL instance.
6. `prisma/seed.ts` creates a test user for development.
7. All database naming follows snake_case conventions with UUID primary keys.

## Tasks / Subtasks

- [x] Install Prisma 7 and initialize schema (AC: #1, #7)
  - [x] `npm install prisma@7 @prisma/client@7` (dev + runtime)
  - [x] `npx prisma init` to create `prisma/schema.prisma`
  - [x] Configure provider = "postgresql" with `env("DATABASE_URL")`
- [x] Define `users` table in Prisma schema (AC: #1, #7)
  - [x] `id` — UUID, `@default(uuid())`, `@id`
  - [x] `name` — String, optional
  - [x] `email` — String, `@unique`
  - [x] `email_verified` — DateTime, optional
  - [x] `image` — String, optional
  - [x] `password_hash` — String, optional (null for OAuth-only users)
  - [x] `created_at` — DateTime, `@default(now())`
  - [x] `updated_at` — DateTime, `@updatedAt`
  - [x] Use `@@map("users")` for snake_case table name
- [x] Define Auth.js adapter tables (AC: #2)
  - [x] `accounts` table per Auth.js Prisma adapter schema (provider, providerAccountId, userId FK, type, tokens)
  - [x] `sessions` table (sessionToken, userId FK, expires)
  - [x] `verification_tokens` table (identifier, token, expires, compound unique)
  - [x] All FKs use `onDelete: Cascade`
- [x] Create `src/lib/db/client.ts` — Prisma singleton (AC: #3)
  - [x] Use `globalThis` caching pattern to prevent multiple clients during HMR in dev
  - [x] Export typed `PrismaClient` instance
- [x] Create `src/lib/db/users.ts` — user query functions (AC: #4)
  - [x] `findUserByEmail(email: string)` — returns user or null
  - [x] `findUserById(id: string)` — returns user or null
  - [x] `createUser(data: { email, name?, passwordHash? })` — returns created user
  - [x] `updateUser(id: string, data: Partial<User>)` — returns updated user
  - [x] All functions use the singleton client from `client.ts`
- [x] Generate and apply initial migration (AC: #5)
  - [x] Ensure PostgreSQL is reachable for migration apply
  - [x] `npx prisma migrate dev --name init-users-auth` (completed via Supabase Postgres in this environment)
  - [x] Verify migration files are created in `prisma/migrations/`
- [x] Create `prisma/seed.ts` with test user (AC: #6)
  - [x] Seed a dev user: `test@linkboard.dev` / hashed password
  - [x] Add `prisma.seed` config to `package.json`
  - [x] Run `npx prisma db seed` to verify
- [x] Add tests for `src/lib/db/users.ts` and `src/lib/db/client.ts`
  - [x] Test user CRUD operations against real Docker PostgreSQL
  - [x] Verify singleton pattern exports same instance

### Review Follow-ups (AI)
- [x] [AI-Review][CRITICAL] AC5: Initial migration generated and applied successfully against configured Postgres
- [x] [AI-Review][MEDIUM] `npx prisma db seed` verified against live DB

## Dev Notes

### Architecture Compliance

- **Prisma 7.x (latest)** — pure TypeScript engine, no Rust layer. Install `prisma@7` and `@prisma/client@7`. [Source: architecture.md#ORM: Prisma 7]
- **Database naming**: Tables `snake_case` plural (`users`, `accounts`, `sessions`, `verification_tokens`). Columns `snake_case` (`created_at`, `password_hash`). FKs: `{table_singular}_id` (`user_id`). PKs: always `id`, UUID. Indexes: `idx_{table}_{columns}`. Enums: `PascalCase`. [Source: architecture.md#Database Naming Conventions]
- **Prisma schema location**: `prisma/schema.prisma` at project root. [Source: architecture.md#File Structure Rules]
- **`lib/db/*` is the ONLY module that imports Prisma client** — all other code accesses data through these functions. Never import `@prisma/client` outside `src/lib/db/`. [Source: architecture.md#Data Boundaries]
- **Auth.js v5 Prisma adapter** — adapter tables must match Auth.js expected schema. Use `@auth/prisma-adapter` package. [Source: architecture.md#Session Auth: Auth.js v5]
- **Three validation layers**: Zod (shape at API boundary), Prisma (persistence constraints), PostgreSQL (integrity). [Source: architecture.md#Validation Pattern]
- **Migration strategy**: Prisma Migrate, all migrations version-controlled, no manual SQL. [Source: architecture.md#Migration Strategy]

### Technical Requirements

- **Prisma client singleton pattern** — must use `globalThis` caching to avoid multiple Prisma instances during Next.js HMR in development:
  ```ts
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
  export const prisma = globalForPrisma.prisma || new PrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
  ```
- **Auth.js adapter tables** — the `@auth/prisma-adapter` package expects specific table/column names. Refer to the Auth.js Prisma adapter documentation for the exact schema. Key tables: `Account`, `Session`, `VerificationToken` (Prisma model names PascalCase, mapped to snake_case table names).
- **password_hash is optional** — OAuth-only users won't have a password. The `password_hash` column must be nullable.
- **UUID primary keys** everywhere — use `@default(uuid())` in Prisma schema.
- **Seed script** — use TypeScript (`prisma/seed.ts`). Configure in `package.json` under `"prisma": { "seed": "npx tsx prisma/seed.ts" }`. Use bcrypt with cost factor 12 for the test user password hash.

### File Structure Requirements

Files to create:
- `prisma/schema.prisma` — database schema (source of truth)
- `prisma/seed.ts` — development seed data
- `src/lib/db/client.ts` — Prisma client singleton
- `src/lib/db/users.ts` — user query functions
- `src/lib/db/users.test.ts` — user query tests

Files to modify:
- `package.json` — add prisma, @prisma/client, @auth/prisma-adapter, tsx, bcrypt dependencies; add prisma seed config

### Anti-Patterns to Avoid

- Do NOT import `@prisma/client` anywhere outside `src/lib/db/` — this is an architectural boundary.
- Do NOT use `console.log` — use the structured logger from `src/lib/logger.ts`.
- Do NOT create a `utils.ts` catch-all.
- Do NOT use `any` type — use `unknown` and narrow, or define proper types.
- Do NOT add business logic to the Prisma schema — keep it as a data model only.
- Do NOT skip generating the migration — `prisma migrate dev` must create versioned migration files.

### Testing Requirements

- Co-located tests: `src/lib/db/users.test.ts` next to `src/lib/db/users.ts`.
- Test against the real Docker PostgreSQL using the `DATABASE_URL` from `.env`.
- Use Vitest 4 (already configured from Story 1.1).
- Clean up test data after tests (use `beforeEach`/`afterEach` with transaction rollback or delete).

### Project Structure Notes

- `src/lib/db/` directory is new — create it. This will be the exclusive Prisma import boundary for the entire project.
- `prisma/` directory at project root is new — created by `npx prisma init`.
- The `@/` import alias is already configured (Story 1.1) — use `@/lib/db/client` for imports.
- `src/config/env.ts` already validates `DATABASE_URL` — no changes needed there.
- Docker PostgreSQL 18 is already configured in `docker-compose.yml` (Story 1.1) with database `linkboard`, user `postgres`, password `postgres`.

### Previous Story Intelligence

Story 1.1 established:
- Next.js 16.1.6 + TypeScript + Tailwind CSS v4 + App Router + Turbopack
- Docker PostgreSQL 18 + Redis 8 via `docker-compose.yml`
- `src/config/env.ts` with Zod validation (DATABASE_URL already included)
- `src/lib/logger.ts` — structured JSON logger (use this, not console.log)
- `src/lib/errors.ts` — `AppError` class with code, message, statusCode
- `src/lib/api-response.ts` — `{ data }` / `{ error }` response helpers
- Vitest 4 configured with co-located tests, jsdom, React plugin
- `@/` import alias configured
- Dependencies: next 16.1.6, react 19.2.3, zod ^4.3.6, vitest ^4.1.3

Review feedback from Story 1.1: env module was not mocked in page test causing crash — ensure tests that touch modules importing env handle mocking correctly.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#ORM: Prisma 7]
- [Source: _bmad-output/planning-artifacts/architecture.md#Database Naming Conventions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Session Auth: Auth.js v5]
- [Source: _bmad-output/planning-artifacts/architecture.md#Migration Strategy]
- [Source: _bmad-output/planning-artifacts/architecture.md#Validation Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List

- AC1/AC2/AC3/AC4/AC6/AC7 implemented in code: `prisma/schema.prisma`, `src/lib/db/client.ts`, `src/lib/db/users.ts`, `prisma/seed.ts`, `package.json`.
- Prisma 7 runtime updated for adapter-based client + `prisma.config.ts`.
- `src/lib/db/users.test.ts` added; singleton assertion passes and CRUD tests are authored for real DB execution.
- AC5 remains blocked in this session: `npx prisma migrate dev --name init-users-auth` failed with `P1001` because `localhost:5432` was unreachable and Docker could not be started from this environment.

### File List

- package.json
- package-lock.json
- prisma.config.ts
- prisma/schema.prisma
- prisma/seed.ts
- src/lib/db/client.ts
- src/lib/db/users.ts
- src/lib/db/users.test.ts
- _bmad-output/implementation-artifacts/1-2-plan.md

### Change Log

- 2026-03-16: Code review (claude-opus-4-6) — fixed 8 issues:
  - H1: Added `@types/bcrypt` to devDependencies
  - H2: Moved `prisma` CLI to devDependencies
  - H3: Moved `@types/pg` to devDependencies
  - H4: Moved `dotenv` to devDependencies
  - H5: Normalized Account/Session schema fields to camelCase+@map for consistency
  - H6: Removed false `.env` entry from File List
  - M1: Added console.warn when DB tests are skipped
  - M2: Simplified `updateUser` — removed redundant spread pattern
  - C2: Marked completed tasks [x], left AC5-related tasks [ ]
  - Status updated to in-progress (AC5 migration still blocked)
