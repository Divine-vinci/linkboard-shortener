# Story 7.1: API Key Generation and Management

Status: done

## Story

As a logged-in user,
I want to generate and manage API keys,
so that I can integrate Linkboard into my automated workflows.

## Acceptance Criteria

1. **Given** I am logged in and on the API keys settings page, **When** I click "Generate New API Key" and provide a name/label, **Then** an API key is generated and displayed ONCE (never shown again), **And** the key is hashed with SHA-256 before storage (NFR9), **And** the `api_keys` table stores `id`, `user_id`, `name`, `key_hash`, `key_prefix` (first 8 chars), `created_at`, `last_used_at`.

2. **Given** I have existing API keys, **When** I view the API keys page, **Then** I see a list of keys with their names, prefixes, creation dates, and last used dates, **And** I can delete any of my keys.

3. **Given** I delete an API key, **When** the deletion is confirmed, **Then** the key is permanently removed and any requests using it immediately fail with 401.

## Tasks / Subtasks

- [x] Task 1: Prisma schema + migration (AC: #1)
  - [x] Add `ApiKey` model to `prisma/schema.prisma`
  - [x] Run `npx prisma migrate dev` to generate migration
  - [x] Update User model with `apiKeys ApiKey[]` relation

- [x] Task 2: Database query layer (AC: #1, #2, #3)
  - [x] Create `src/lib/db/api-keys.ts` with typed CRUD functions
  - [x] Create `src/lib/db/api-keys.test.ts`

- [x] Task 3: Zod validation schemas (AC: #1)
  - [x] Create `src/lib/validations/api-key.ts`

- [x] Task 4: API key generation utility (AC: #1)
  - [x] Create `src/lib/auth/api-key.ts` with key generation and SHA-256 hashing

- [x] Task 5: API route handlers (AC: #1, #2, #3)
  - [x] Create `src/app/api/v1/user/api-keys/route.ts` (GET list, POST create)
  - [x] Create `src/app/api/v1/user/api-keys/[id]/route.ts` (DELETE)
  - [x] Create route tests

- [x] Task 6: Settings UI — API Keys page (AC: #1, #2, #3)
  - [x] Create `src/app/(dashboard)/dashboard/settings/api-keys/page.tsx`
  - [x] Create `src/components/settings/api-key-manager.tsx` (client component)
  - [x] Create component test

- [x] Task 7: Settings navigation (AC: #2)
  - [x] Add "API Keys" link/tab to settings navigation from the settings page

## Dev Notes

### Prisma Schema — `ApiKey` Model

Add to `prisma/schema.prisma` in the `public` schema:

```prisma
model ApiKey {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  name      String    @db.VarChar(100)
  keyHash   String    @map("key_hash") @db.VarChar(64)
  keyPrefix String    @map("key_prefix") @db.VarChar(8)
  createdAt DateTime  @default(now()) @map("created_at")
  lastUsedAt DateTime? @map("last_used_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([keyHash])
  @@index([userId])
  @@map("api_keys")
  @@schema("public")
}
```

Add to the existing `User` model:
```prisma
apiKeys   ApiKey[]
```

Key design decisions:
- `keyHash` is indexed for O(1) lookup during API authentication (Story 7.2+ will use this)
- `keyPrefix` stores first 8 chars of the raw key for display identification
- `onDelete: Cascade` — deleting a user removes all their API keys
- `lastUsedAt` is nullable (never used yet) — future stories will update this during API auth

### API Key Generation Logic (`src/lib/auth/api-key.ts`)

```typescript
import { createHash, randomBytes } from "crypto";

const API_KEY_PREFIX = "lb_";  // Linkboard prefix for easy identification
const KEY_BYTE_LENGTH = 32;    // 256-bit random key

export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const randomPart = randomBytes(KEY_BYTE_LENGTH).toString("hex");
  const rawKey = `${API_KEY_PREFIX}${randomPart}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.substring(0, 8);
  return { rawKey, keyHash, keyPrefix };
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}
```

- Use Node.js built-in `crypto` — do NOT add external libraries
- SHA-256 per NFR9 (not bcrypt — API keys need fast hash comparison for every request)
- Prefix `lb_` makes keys identifiable as Linkboard keys (industry standard pattern)

### Database Query Layer (`src/lib/db/api-keys.ts`)

Follow the established pattern in `src/lib/db/users.ts` and `src/lib/db/boards.ts`:

```typescript
import { prisma } from "./client";

export type CreateApiKeyInput = {
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
};

export async function createApiKey(data: CreateApiKeyInput) { ... }
export async function findApiKeysByUserId(userId: string) { ... }
export async function findApiKeyById(id: string, userId: string) { ... }
export async function deleteApiKey(id: string, userId: string) { ... }
```

- Always scope queries with `userId` for ownership enforcement (NFR13 pattern)
- Return keys ordered by `createdAt` descending
- `findApiKeysByUserId` returns only: `id`, `name`, `keyPrefix`, `createdAt`, `lastUsedAt` (NEVER return `keyHash`)

### Zod Validation (`src/lib/validations/api-key.ts`)

```typescript
import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
```

### API Route Handlers

**`src/app/api/v1/user/api-keys/route.ts`** — GET (list) + POST (create)
**`src/app/api/v1/user/api-keys/[id]/route.ts`** — DELETE

Follow the exact pattern in `src/app/api/v1/boards/route.ts`:
- Auth check via `auth()` from `@/lib/auth/config`
- Zod validation via `safeParse` with `fieldErrorsFromZod`
- Response via `successResponse()` / `errorResponse()` from `@/lib/api-response`
- Error handling: `AppError` from `@/lib/errors`
- Logging: `logger` from `@/lib/logger`

POST response MUST include the raw key in the response body (the ONLY time it's returned):
```json
{ "data": { "id": "...", "name": "...", "keyPrefix": "lb_xxxxx", "rawKey": "lb_abc123...", "createdAt": "..." } }
```

GET response returns list WITHOUT rawKey:
```json
{ "data": [{ "id": "...", "name": "...", "keyPrefix": "lb_xxxxx", "createdAt": "...", "lastUsedAt": null }] }
```

DELETE returns 204 with no body.

### Settings UI

**Page:** `src/app/(dashboard)/dashboard/settings/api-keys/page.tsx`
- Server component wrapper, same layout pattern as `src/app/(dashboard)/dashboard/settings/page.tsx`
- Section header: "API Keys" with description "Manage API keys for programmatic access to Linkboard"
- Renders `<ApiKeyManager />` client component

**Component:** `src/components/settings/api-key-manager.tsx`
- Client component (`"use client"`) following `src/components/settings/profile-form.tsx` pattern
- Uses `react-hook-form` + `zodResolver` for the create form
- Fetches existing keys on mount via `GET /api/v1/user/api-keys`
- Create form: single "Name" input + "Generate Key" button
- On successful creation: show the raw key in a highlighted box with copy-to-clipboard button and warning "This key will not be shown again"
- Key list: table with columns: Name, Key Prefix, Created, Last Used, Actions (Delete button)
- Delete: confirmation dialog before calling DELETE endpoint
- Use existing UI components from `src/components/ui/` (button, input, table, dialog)

**Navigation:** Add a link to `/dashboard/settings/api-keys` from the settings area. Check the existing sidebar (`src/components/layout/sidebar.tsx`) for navigation patterns — add under Settings or as a sub-navigation within the settings page.

### Project Structure Notes

All file locations align with the architecture document's prescribed structure:
- `src/lib/db/api-keys.ts` — [Source: architecture.md, line ~593]
- `src/lib/auth/api-key.ts` — [Source: architecture.md, line ~596]
- `src/lib/validations/api-key.ts` — follows pattern of `auth.ts`, `board.ts`, `link.ts`
- `src/app/api/v1/user/api-keys/` — under user namespace (keys belong to user, not a public resource)
- `src/app/(dashboard)/dashboard/settings/api-keys/page.tsx` — [Source: architecture.md, line ~521-522]

### Testing Standards

- Use Vitest with the established mocking pattern (see `src/app/api/v1/boards/route.test.ts`)
- Mock `@/lib/auth/config` → `auth`, mock `@/lib/db/api-keys` → query functions
- Test all auth guard paths (no session → 401)
- Test Zod validation (missing name, empty name, too-long name → 400)
- Test happy paths (create returns 201 with rawKey, list returns 200, delete returns 204)
- Test ownership enforcement (delete someone else's key → 404)
- Component test: mock fetch, verify key list renders, verify create flow shows raw key, verify delete confirmation

### Security Considerations

- Raw API key is returned ONLY in the POST response — never stored, never logged, never returned again
- `keyHash` is NEVER included in any API response
- All queries enforce `userId` ownership — no admin/cross-user access paths
- Logger must NOT log raw keys or hashes — only log `keyPrefix` and `id` for debugging
- SHA-256 is appropriate here (not bcrypt) because API keys are high-entropy random values, not user-chosen passwords

### References

- [Source: epics.md, Story 7.1 — acceptance criteria and BDD scenarios]
- [Source: architecture.md, "API Key Auth: Custom implementation" — SHA-256 hashing, Bearer token pattern]
- [Source: architecture.md, "Authentication & Security" — ownership-based authorization, NFR13]
- [Source: architecture.md, file structure — prescribed file locations for api-keys modules]
- [Source: prd.md, FR26 — API key generation and management requirement]
- [Source: prd.md, NFR9 — API keys hashed at rest, displayed once at creation]
- [Source: prd.md, Journey 5 (Kenji) — automation engineer persona driving API key requirements]

### Previous Epic Intelligence

Epic 6 (Link Analytics) is the most recently completed epic. Key patterns from recent work:
- Test suite: 413 passed, 9 skipped — maintain this baseline
- Analytics queries in `src/lib/db/analytics.ts` demonstrate ownership-scoped query patterns
- Dashboard page pattern with server component + client component composition is well-established
- `npm run lint` must pass

### Git Intelligence

Recent commits follow pattern: `[BMAD Phase 4] Story X.Y: Description`
- All recent work was in Epic 6 (analytics)
- Epic 7 starts fresh — no prior API-related code exists
- The codebase has 413+ passing tests; this story must not regress any

## Dev Agent Record

### Agent Model Used
openai/gpt-5.4

### Debug Log References
- `npm test`
- `npm run lint`
- `npx prisma migrate dev --name add_api_keys` (blocked by existing Supabase auth/public drift; manual SQL migration added at `prisma/migrations/20260318210000_add_api_keys/migration.sql`)
- `npx prisma generate`

### Completion Notes List
- AC1: Added `ApiKey` Prisma model + `User.apiKeys` relation in `prisma/schema.prisma`; created SQL migration at `prisma/migrations/20260318210000_add_api_keys/migration.sql`; shipped `src/lib/auth/api-key.ts` SHA-256 generator and owner-scoped CRUD/API handlers.
- AC2: Added `src/app/(dashboard)/dashboard/settings/api-keys/page.tsx`, `src/components/settings/api-key-manager.tsx`, and `src/components/settings/settings-nav.tsx` to list keys with prefix/created/last used metadata and settings navigation.
- AC3: Added delete confirmation UI and `DELETE /api/v1/user/api-keys/[id]`; owned-key deletion returns 204 and removes key immediately from UI state.
- Tests: `npm test` => 74 passed / 1 skipped file, 433 passed / 9 skipped tests; `npm run lint` passed.

### File List
- `prisma/schema.prisma`
- `prisma/migrations/20260318210000_add_api_keys/migration.sql`
- `src/lib/db/api-keys.ts`
- `src/lib/db/api-keys.test.ts`
- `src/lib/validations/api-key.ts`
- `src/lib/auth/api-key.ts`
- `src/lib/auth/api-key.test.ts`
- `src/app/api/v1/user/api-keys/route.ts`
- `src/app/api/v1/user/api-keys/route.test.ts`
- `src/app/api/v1/user/api-keys/[id]/route.ts`
- `src/app/api/v1/user/api-keys/[id]/route.test.ts`
- `src/app/(dashboard)/dashboard/settings/page.tsx`
- `src/app/(dashboard)/dashboard/settings/api-keys/page.tsx`
- `src/components/settings/api-key-manager.tsx`
- `src/components/settings/api-key-manager.test.tsx`
- `src/components/settings/settings-nav.tsx`
- `src/components/settings/settings-nav.test.tsx`



## Amelia Implementation Summary
- AC1: Added `ApiKey` Prisma model + `User.apiKeys` relation in `prisma/schema.prisma`, manual SQL migration `prisma/migrations/20260318210000_add_api_keys/migration.sql`, SHA-256 utility `src/lib/auth/api-key.ts`, DB layer `src/lib/db/api-keys.ts`, validation `src/lib/validations/api-key.ts`, and user-scoped API routes under `src/app/api/v1/user/api-keys/`.
- AC2: Added settings navigation `src/components/settings/settings-nav.tsx`, updated `src/app/(dashboard)/dashboard/settings/page.tsx`, and shipped `src/app/(dashboard)/dashboard/settings/api-keys/page.tsx` + `src/components/settings/api-key-manager.tsx` for list/create flows.
- AC3: Added destructive confirmation + owned-key delete flow in `src/components/settings/api-key-manager.tsx` and `src/app/api/v1/user/api-keys/[id]/route.ts`.
- Verification: `npm test` passed (`74` files passed, `1` skipped; `433` tests passed, `9` skipped). `npm run lint` passed.
- Migration note: `npx prisma migrate dev --name add_api_keys` was blocked by existing Supabase auth/public drift on the configured datasource, so the migration SQL was authored manually and `npx prisma generate` completed successfully.

## Code Review Record

### Reviewer Agent
claude-opus-4-6

### Review Date
2026-03-18

### Findings Summary
- **2 HIGH** issues found and fixed
- **3 MEDIUM** issues found (2 fixed, 1 downgraded — UUID validation matches existing codebase convention)
- **2 LOW** issues noted (not fixed — no per-user key limit; keyHash index without unique constraint)

### Fixes Applied
1. **H1 — `findApiKeyById` leaked `keyHash`**: Removed `keyHash` from `findApiKeyById` select. Added dedicated `findApiKeyByHash()` for auth-only hash lookups (Story 7.2+).
2. **H2 — Dead code**: `findApiKeyById` was unused but retained as it will be needed in Story 7.2+. Now safe since hash is no longer exposed.
3. **M2 — Dialog missing Escape key**: Added `onKeyDown` handler to delete confirmation dialog for Escape key dismissal.
4. **M3 — Inconsistent auth pattern**: Extracted `requireSessionUserId()` helper in `[id]/route.ts` to match `route.ts` pattern.

### Post-Fix Verification
- `npm test`: 74 files passed, 1 skipped; **434 tests passed** (+1 new), 9 skipped
- `npm run lint`: passed
