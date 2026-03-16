# Story 1.1: Project Initialization and Dev Environment

Status: done

## Story

As a developer,
I want the Next.js 16 project initialized with Docker-based PostgreSQL and Redis,
so that I have a working development environment to build all features upon.

## Acceptance Criteria

1. A Next.js 16 project is created using `npx create-next-app@latest linkboard --yes` with TypeScript, Tailwind CSS, ESLint, App Router, and Turbopack enabled.
2. `docker-compose.yml` provides PostgreSQL 18 and Redis 8 for local development.
3. `.env.example` documents all required environment variables.
4. `src/config/env.ts` validates environment variables with Zod at startup and fails fast on invalid config.
5. `src/lib/logger.ts` provides structured JSON logging; `console.log` is not used.
6. `src/lib/errors.ts` defines `AppError` with `code`, `message`, and `statusCode`.
7. `src/lib/api-response.ts` provides standard `{ data }` / `{ error }` response helpers.
8. Vitest 4 is configured with co-located test support (`*.test.ts` / `*.test.tsx`).
9. The `@/` import alias is configured for project imports.
10. The project builds and the dev server starts without errors.

## Tasks / Subtasks

- [x] Initialize the Next.js 16 app with the architecture-selected starter.
- [x] Add local infrastructure scaffolding (`docker-compose.yml`, `.env.example`).
- [x] Add shared foundation modules: `src/config/env.ts`, `src/lib/logger.ts`, `src/lib/errors.ts`, `src/lib/api-response.ts`.
- [x] Configure Vitest 4 and add a smoke test for shared helpers.
- [x] Verify `npm run build`, `npm run test`, and a non-interactive dev server boot succeed.

## Dev Notes

- Use the selected starter from architecture: Next.js 16 + TypeScript + Tailwind CSS v4 + ESLint + App Router + Turbopack. [Source: _bmad-output/planning-artifacts/architecture.md#Selected Starter: Next.js 16 (create-next-app)]
- Keep source under `src/` and preserve App Router structure. `src/config/env.ts` and `src/lib/*` are expected architectural locations. [Source: _bmad-output/planning-artifacts/architecture.md#Directory Structure Convention]
- `lib/db/*` must remain the only Prisma-importing boundary later; do not introduce DB code in this story. [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- Logging must be structured JSON with safe metadata only. Never log secrets. [Source: _bmad-output/planning-artifacts/architecture.md#Logging Pattern]
- Response helpers must enforce wrapped `{ data }` / `{ error }` payloads. [Source: _bmad-output/planning-artifacts/architecture.md#API Response Formats]
- Validation should use Zod 4 and fail fast during startup. [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions]
- Testing stack is Vitest 4 + React Testing Library; co-located tests are the project convention. [Source: _bmad-output/planning-artifacts/architecture.md#Testing]

### Project Structure Notes

- Place framework files at repo root (`package.json`, `next.config.ts`, `docker-compose.yml`, `vitest.config.ts`).
- Place app code under `src/` and shared utilities under `src/lib/`.
- Use kebab-case filenames, PascalCase components, and camelCase functions/variables.

### References

- `_bmad-output/planning-artifacts/epics.md` — Epic 1, Story 1.1
- `_bmad-output/planning-artifacts/architecture.md` — Selected starter, directory structure, logging, validation, testing

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- Recovery note: sprint-planning did not leave `sprint-status.yaml`; recreated from Epic 1 story list before resuming.

### Completion Notes List

- Code review (Amelia, 2026-03-16): Fixed failing `page.test.tsx` — env module was not mocked, causing crash. Added missing tests for `logger.ts` and `errors.ts`. Fixed `.gitignore` excluding `.env.example`. Updated task checkboxes and File List.

### File List

- `package.json` — project manifest with Next.js 16, React 19, Zod 4, Vitest 4
- `package-lock.json` — lockfile
- `tsconfig.json` — TypeScript config with `@/` path alias
- `next.config.ts` — Next.js configuration
- `eslint.config.mjs` — ESLint flat config with next/core-web-vitals and typescript
- `postcss.config.mjs` — PostCSS config for Tailwind CSS v4
- `vitest.config.ts` — Vitest 4 config with jsdom, React plugin, path alias
- `vitest.setup.ts` — test setup importing jest-dom matchers
- `docker-compose.yml` — PostgreSQL 18 and Redis 8 services
- `.env.example` — documented environment variables
- `.gitignore` — git ignore rules
- `src/config/env.ts` — Zod-validated environment configuration
- `src/lib/logger.ts` — structured JSON logger
- `src/lib/errors.ts` — AppError class with code, message, statusCode
- `src/lib/api-response.ts` — `{ data }` / `{ error }` response helpers
- `src/lib/api-response.test.ts` — tests for api-response helpers
- `src/lib/logger.test.ts` — tests for logger (added in review)
- `src/lib/errors.test.ts` — tests for AppError (added in review)
- `src/app/layout.tsx` — root layout with Geist fonts, dark theme
- `src/app/page.tsx` — foundation readiness landing page
- `src/app/page.test.tsx` — component test with env mock (fixed in review)
- `src/app/globals.css` — global Tailwind styles
- `src/app/favicon.ico` — favicon
