# Story 1.2 Plan

1. Update dependencies and package scripts/config for Prisma/Auth.js seed flow.
2. Add Prisma schema with snake_case mappings for users + Auth.js tables.
3. Add db boundary modules: `src/lib/db/client.ts`, `src/lib/db/users.ts`.
4. Generate/apply migration against Docker PostgreSQL and verify schema.
5. Add `prisma/seed.ts` and verify seed run.
6. Add unit/integration tests for db client singleton + user queries.
7. Run lint + tests; record completion in story artifact and BMAD state.
