# Story 4.1: Dashboard Layout and Sidebar Navigation

Status: review

## Story

As a logged-in user,
I want a consistent navigation layout with sidebar (desktop) and bottom nav (mobile),
So that I can move between boards, link library, analytics, and settings seamlessly.

## Acceptance Criteria

1. **Given** I am logged in on a desktop browser (1024px+)
   **When** any dashboard page loads
   **Then** I see a sidebar navigation with links to: Dashboard, Links, Boards, Analytics, Settings
   **And** the current page is highlighted in the navigation

2. **Given** I am on a mobile device (< 768px)
   **When** any dashboard page loads
   **Then** I see a bottom navigation bar with the same navigation items
   **And** touch targets are appropriately sized for mobile interaction (min 44x44px)

3. **Given** I am on a tablet (768px-1023px)
   **When** any dashboard page loads
   **Then** the sidebar is collapsed but expandable

4. **And** all navigation elements are keyboard-navigable with visible focus indicators (NFR22)
5. **And** the dashboard reaches First Contentful Paint in < 1.5s (NFR3)

## Tasks / Subtasks

- [x] Task 1: Create navigation data and types (AC: #1, #2, #3)
  - [x] Define navigation items array with icons: Dashboard (`/dashboard`), Links (`/dashboard/links`), Boards (`/dashboard/boards`), Analytics (`/dashboard/analytics`), Settings (`/dashboard/settings`)
  - [x] Analytics page doesn't exist yet (Epic 6) — link to `/dashboard/analytics` but it can show a placeholder or 404; the nav link must still be present per spec

- [x] Task 2: Create SidebarNav client component (AC: #1, #4)
  - [x] Create `src/components/layout/sidebar-nav.tsx` — client component using `usePathname()` for active state
  - [x] Active state detection: match current path to nav item href (use `startsWith` for nested routes like `/dashboard/boards/[id]`)
  - [x] Active indicator: `border-emerald-400 text-emerald-300 bg-emerald-500/10` on active item
  - [x] Inactive: `text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50`
  - [x] Use `aria-current="page"` on active navigation link
  - [x] Wrap in `<nav aria-label="Dashboard navigation">`
  - [x] Include user email display and LogoutButton at bottom of sidebar

- [x] Task 3: Create BottomNav client component (AC: #2, #4)
  - [x] Create `src/components/layout/bottom-nav.tsx` — client component
  - [x] Fixed bottom bar: `fixed bottom-0 left-0 right-0` with `z-50`
  - [x] Icons + labels for each nav item (use lucide-react icons — already in project via shadcn)
  - [x] Touch targets: `min-h-[44px] min-w-[44px]` per WCAG
  - [x] Active state with same emerald color pattern
  - [x] `aria-current="page"` on active item

- [x] Task 4: Create CollapsedSidebar for tablet (AC: #3, #4)
  - [x] Icons-only sidebar at `md:` breakpoint (768px-1023px)
  - [x] Expandable on hover or click — use local state to toggle width
  - [x] Tooltip on icons when collapsed (show label)
  - [x] Smooth transition: `transition-all duration-200`

- [x] Task 5: Update dashboard layout (AC: #1, #2, #3, #5)
  - [x] Modify `src/app/(dashboard)/layout.tsx` to use new sidebar/bottom nav components
  - [x] Desktop layout: sidebar on left (w-64) + main content area
  - [x] Tablet layout: collapsed sidebar (w-16) + main content
  - [x] Mobile layout: full-width content + bottom nav (add `pb-20` for bottom nav spacing)
  - [x] Remove the current header-based navigation
  - [x] Keep server component for session — pass user data as props to client nav components
  - [x] Maintain `max-w-5xl` for content area or adjust as needed for sidebar layout

- [x] Task 6: Write tests (AC: all)
  - [x] Test SidebarNav: renders all nav items, active state detection, keyboard navigation
  - [x] Test BottomNav: renders all nav items, active state, touch target sizing
  - [x] Test layout integration: correct nav variant shown per viewport concept
  - [x] Co-locate test files next to components

## Dev Notes

### Architecture & Patterns

- **Current layout**: `src/app/(dashboard)/layout.tsx` has an inline header nav with Links, Boards, Settings. This must be replaced with the sidebar/bottom nav pattern.
- **Framework**: Next.js 16 App Router. Dashboard layout is a server component that calls `auth()` for session.
- **Navigation components must be client components** because they use `usePathname()` from `next/navigation` for active state detection.
- **Auth session**: The layout fetches session server-side. Pass `session.user.email` as a prop to the sidebar component — don't re-fetch in client components.

### Styling Conventions (MUST FOLLOW)

- **Dark theme palette**:
  - Backgrounds: `zinc-900/70` (panels), `zinc-950` (page bg)
  - Borders: `border-zinc-800`
  - Text: `zinc-100` (primary), `zinc-400` (secondary)
  - Accent: `emerald-400` (active/hover)
- **Border radius**: `rounded-3xl` for containers, `rounded-2xl` for buttons/nav items
- **Focus pattern**: `focus:outline-none focus:ring-2 focus:ring-emerald-400/40`
- **Hover pattern**: `hover:border-emerald-400 hover:text-emerald-300`
- **Transition**: `transition` on all interactive elements

### Responsive Breakpoints

- `< 768px` (base/default): Mobile — bottom navigation bar
- `md:` (768px-1023px): Tablet — collapsed sidebar (icons only, expandable)
- `lg:` (1024px+): Desktop — full sidebar with labels

Use Tailwind responsive classes: hide/show components per breakpoint. Render both sidebar and bottom nav in the layout; use `hidden md:flex` / `flex md:hidden` to toggle visibility.

### Navigation Items

```
Dashboard  → /dashboard         → LayoutDashboard icon
Links      → /dashboard/links   → Link icon
Boards     → /dashboard/boards  → Kanban icon
Analytics  → /dashboard/analytics → BarChart3 icon
Settings   → /dashboard/settings → Settings icon
```

Icons from `lucide-react` (already installed as dependency of shadcn/ui).

### Accessibility Requirements (NFR20, NFR22)

- `<nav>` element with `aria-label="Dashboard navigation"`
- `aria-current="page"` on the active link
- All items reachable via Tab key
- Visible focus ring on focus (emerald ring pattern)
- Color contrast minimum 4.5:1 — emerald-400 on zinc-900 meets this
- Bottom nav touch targets: minimum 44x44px

### Performance (NFR3)

- Navigation components are lightweight — just links and icons
- No heavy JS bundles; `usePathname()` is minimal client-side code
- Server component layout means auth check is server-side, not client bundle
- Do NOT add unnecessary client-side data fetching in nav components

### Files to Create/Modify

| Action | File | Notes |
|--------|------|-------|
| CREATE | `src/components/layout/sidebar-nav.tsx` | Desktop + tablet sidebar (client component) |
| CREATE | `src/components/layout/sidebar-nav.test.tsx` | Tests |
| CREATE | `src/components/layout/bottom-nav.tsx` | Mobile bottom nav (client component) |
| CREATE | `src/components/layout/bottom-nav.test.tsx` | Tests |
| MODIFY | `src/app/(dashboard)/layout.tsx` | Replace header nav with sidebar + bottom nav |

### Existing Code to Reuse

- `LogoutButton` from `@/components/auth/logout-button` — already a client component, use in sidebar
- `auth()` from `@/lib/auth/config` — keep calling in layout server component
- `next/link` — use for all nav items (client-side navigation)

### Previous Story Context

- Story 3.5 (Board Detail View) established the current component patterns: server components for pages, client components for interactivity
- Test baseline: 327 tests passing, 8 skipped — do not break existing tests
- Build and lint must pass: `npm run build`, `npm run lint`, `npm test`

### Anti-Patterns to Avoid

- Do NOT create a global state/context for navigation state — `usePathname()` is sufficient
- Do NOT use JavaScript media queries — use Tailwind responsive classes
- Do NOT add data fetching in navigation components — they only need the pathname
- Do NOT remove the `auth()` call from the layout — it protects dashboard routes
- Do NOT create a separate mobile layout file — use one layout with responsive components

### Project Structure Notes

- New components go in `src/components/layout/` directory (create if needed)
- Tests co-located as `*.test.tsx` files
- Follow existing import alias: `@/components/...`, `@/lib/...`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4, Story 4.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: src/app/(dashboard)/layout.tsx — current navigation implementation to replace]
- [Source: _bmad-output/planning-artifacts/prd.md#FR31, FR33, NFR3, NFR20, NFR22]

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
N/A

### Completion Notes List
- Created navigation registry, sidebar (desktop+tablet), and bottom nav (mobile) components
- Replaced old header nav in dashboard layout with responsive sidebar/bottom-nav shell
- Added analytics placeholder page, dashboard and links route shims
- Added lucide-react as direct dependency (was not previously in package.json despite story notes)
- Code review fix: added LogoutButton and user email to tablet sidebar (was missing)
- Code review fix: added dedicated unit tests for isNavigationItemActive utility
- All 339 tests pass (333 existing + 6 new), lint passes

### File List
- CREATE `src/components/layout/navigation.tsx` — nav item registry and active-state utility
- CREATE `src/components/layout/navigation.test.ts` — unit tests for isNavigationItemActive
- CREATE `src/components/layout/sidebar-nav.tsx` — desktop + tablet sidebar (client component)
- CREATE `src/components/layout/sidebar-nav.test.tsx` — sidebar nav tests
- CREATE `src/components/layout/bottom-nav.tsx` — mobile bottom nav (client component)
- CREATE `src/components/layout/bottom-nav.test.tsx` — bottom nav tests
- CREATE `src/app/(dashboard)/dashboard/page.tsx` — dashboard landing route shim
- CREATE `src/app/(dashboard)/dashboard/links/page.tsx` — links route shim
- CREATE `src/app/(dashboard)/dashboard/analytics/page.tsx` — analytics placeholder
- CREATE `src/app/(dashboard)/layout.test.tsx` — layout integration tests
- MODIFY `src/app/(dashboard)/layout.tsx` — replaced header nav with sidebar/bottom-nav shell
- MODIFY `package.json` / `package-lock.json` — added lucide-react dependency
