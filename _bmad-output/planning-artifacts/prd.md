---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
status: complete
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief.md
workflowType: 'prd'
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: web_app
  domain: general
  complexity: low
  projectContext: greenfield
---

# Product Requirements Document - Linkboard

**Author:** User
**Date:** 2026-03-16

## Executive Summary

Linkboard is a link management platform that unifies URL shortening, board-based organization, click analytics, and sharing into a single workflow. It targets content marketers managing campaign links across fragmented tools, engineering leads maintaining scattered documentation URLs, and content creators sharing curated resource collections without analytics. The core problem: links are treated as either disposable artifacts (shorteners) or personal saves (bookmarkers) — no tool bridges shortening, organizing, sharing, and analyzing as a unified workflow. Linkboard fills that gap.

### What Makes This Special

The board metaphor is the differentiator. Links aren't shortened into a flat, context-free list — they're curated into themed, shareable collections with preserved context (who added it, why, how it's performing). This is Pinterest for links: campaign managers get per-board analytics dashboards instead of spreadsheet cross-referencing, engineering leads get maintainable link directories instead of 200-line Slack pinned messages, and creators get public boards with engagement data instead of context-free Linktree pages. API-first architecture and self-hostable design make it a natural fit for developer workflows and data-sovereign teams — gaps no SaaS shortener addresses.

## Project Classification

- **Project Type:** Full-stack web application (responsive SPA with RESTful API backend)
- **Domain:** General / Productivity & Developer Tools
- **Complexity:** Low — standard web application security, no regulatory compliance requirements
- **Project Context:** Greenfield — new product built from scratch

## Success Criteria

### User Success

- **Time to First Board:** Users create their first board with 3+ links within 5 minutes of signup. This is the "aha moment" — the instant they see their links organized instead of scattered.
- **Workflow Consolidation:** Users stop switching between shortener + spreadsheet + analytics tools within the first week. One tool replaces three.
- **Board Sharing:** 30% of boards are shared externally within the first month — proof that boards aren't just personal organization but shareable knowledge assets.
- **Return Engagement:** 60% weekly active rate among registered users — they come back because Linkboard is where their links live, not a one-off tool.

### Business Success

**3-Month Targets (MVP Launch):**
- 500 registered users from beta channels
- 50 active teams/organizations using collaborative boards
- 99.9% uptime for link redirects (redirects are the trust layer — one failure erodes confidence)

**12-Month Targets:**
- 10,000 registered users
- 500 paying teams/organizations (freemium model)
- 1M+ link redirects per month
- 100+ API consumers (developer ecosystem validation)

### Technical Success

- Link redirect latency < 50ms at p99 — redirects must feel instant, no perceptible delay
- API response time < 200ms at p95
- Error rate < 0.1% of requests
- Zero data loss scenarios — links are trust assets, losing one is unacceptable
- Security audit passed: auth, injection, XSS hardened before public beta

### Measurable Outcomes

| Outcome | Metric | Target | Timeframe |
|---------|--------|--------|-----------|
| User activation | Board with 3+ links in first session | 80% of signups | Per user |
| Retention signal | Second board created within first week | 40% of activated users | Weekly |
| Sharing validation | Board shared within 48h of signup | 30% of users (→ 80% 30-day retention) | Per user |
| Power user signal | API key generated in first week | 10% of users | Weekly |
| Growth signal | User invites teammate | 25% of active users | Monthly |
| NPS health | Net Promoter Score | > 50 | Quarterly |

## User Journeys

### Journey 1: Maya — Campaign Link Manager (Content Marketer, Success Path)

Maya manages 15-20 active campaigns at her mid-size SaaS company. Right now her mornings start with a ritual she hates: opening Bitly for link stats, cross-referencing a color-coded Google Sheet, and copy-pasting numbers into a weekly report. When her VP asks "how did the LinkedIn campaign perform?", she scrambles across three dashboards.

**Discovery:** Maya finds Linkboard through a "Best Bitly Alternatives" article. The phrase "boards for campaigns" catches her eye — that's exactly how she thinks about links.

**First Session:** She signs up, creates a board called "Q2 Email Campaign," and starts shortening her first links directly into it. Custom slugs (`lnkb.rd/q2-webinar`, `lnkb.rd/q2-ebook`) — done in seconds. She drags three more links in, adds descriptions, and shares the board URL with her design lead.

**Climax:** Tuesday morning. She opens Linkboard, clicks into the Q2 board, and sees a real-time analytics dashboard — click counts by link, top referrers, daily trend line. The webinar link is outperforming the ebook 3:1. She screenshots the dashboard and drops it in Slack. No spreadsheet. No cross-referencing. Five minutes, not an hour.

**New Reality:** Every campaign starts with a Linkboard board. Her team collaborates on shared boards. Weekly reporting is a screenshot, not a chore. She's freed 2+ hours per week.

**Requirements Revealed:** Board creation with campaign context, custom slugs, per-board analytics dashboard, shareable board URLs, multi-link board views, click timeline visualization.

### Journey 2: Dev — Team Documentation Hub (Engineering Lead, Success Path)

Dev leads 10 engineers at a startup. New hires ask "where's the link to...?" multiple times daily. The team's canonical link source is a 200-line pinned Slack message titled "Important Links" that nobody updates and everyone dreads scrolling through.

**Discovery:** Dev sees Linkboard on Hacker News. The API-first architecture and "boards for teams" concept resonate — this could replace the Slack pinned message.

**First Session:** He creates a workspace, then builds boards: "Onboarding," "Production Systems," "API References," "Team Tools." He uses the API to bulk-create short links from a JSON file he exports from the old Slack message. Each link gets a description and tags.

**Climax:** A new hire starts on Monday. Dev sends one link: `lnkb.rd/b/onboarding`. The new hire messages at end of day: "I found everything I needed on the Onboarding board." No DMs asking for links. No digging through Slack history.

**New Reality:** Linkboard is the team's canonical link directory. When a service URL changes, Dev updates the target in Linkboard — all short links auto-redirect to the new destination. CI pipelines auto-create short links for deployment previews via the API.

**Requirements Revealed:** API for bulk link creation, link target updating (redirect preservation), board organization with tags, team board sharing, API key authentication, link metadata management.

### Journey 3: Priya — Public Resource Curator (Content Creator, Success Path)

Priya is a tech educator with 50K YouTube subscribers. After every video, viewers ask "where are the links to all those tools?" She maintains Notion pages (ugly URLs, no analytics) and uses Linktree for her bio (flat list, no organization).

**Discovery:** She sees another creator's Linkboard collection shared on Twitter/X — a clean, organized resource page with a custom domain. "I need this."

**First Session:** She signs up, creates a public board "My Favorite Dev Tools," and curates 15 links with descriptions. She sets board visibility to public. The board URL (`lnkb.rd/b/priya-dev-tools`) goes in her YouTube description.

**Climax:** A week later, she checks analytics. 2,000 clicks on the board. Her "React Resources" sub-board is getting 3x the traffic of "Python Tools." She's never had this data before — now she knows what her audience actually wants.

**New Reality:** Every video gets a companion Linkboard. Her bio link points to her Linkboard profile. She can see which resources resonate, informing future content. Custom domain (`priya.link`) makes her brand look professional.

**Requirements Revealed:** Public board visibility, public board rendering (clean, fast, no-auth view), per-board analytics for public boards, custom board URLs, link descriptions and organization within boards.

### Journey 4: Maya — Error Recovery (Edge Case)

Maya accidentally deletes a link from her active Q2 board. The link was already shared in a newsletter that went out to 10,000 subscribers.

**Rising Action:** She notices the deletion immediately. Panic — the newsletter link is now broken.

**Resolution:** She checks — the short URL still resolves because link deletion only removes it from the board, not from the system. She re-adds the link to the board. Crisis averted. She learns the difference between "remove from board" and "delete link permanently."

**Requirements Revealed:** Soft vs. hard delete distinction, link persistence independent of board membership, undo/recovery for accidental removals, clear UI language distinguishing "remove from board" vs "delete link."

### Journey 5: Admin — Organization Management (Secondary User)

Alex is an ops manager who oversees Linkboard adoption for their 50-person marketing department. He needs to manage user access, monitor usage, and ensure brand consistency.

**Journey:** Alex sets up the team workspace, invites department members via email, assigns roles (editors for campaign managers, viewers for executives). He configures the custom domain and monitors the usage dashboard to track adoption. When an employee leaves, he revokes access and transfers board ownership.

**Requirements Revealed:** User invitation and role management, usage analytics dashboard (admin-level), account/workspace settings, user deactivation and ownership transfer, custom domain configuration.

### Journey 6: API Consumer — CI/CD Integration (Developer User)

Kenji is an automation engineer who integrates Linkboard into the team's deployment pipeline. Every staging deploy should auto-generate a short link for QA to access.

**Journey:** Kenji generates an API key from his Linkboard account. He writes a GitHub Actions step that calls the Linkboard API to create a short link pointing to the staging URL, tagged with the PR number. The short link is posted as a PR comment. QA clicks the link, tests the deploy. After merge, the staging link expires automatically.

**Requirements Revealed:** API key generation and management, programmatic link creation with metadata, link expiration (TTL), rate limiting with clear error messages, API documentation (OpenAPI/Swagger).

### Journey Requirements Summary

| Capability Area | Journeys That Require It |
|----------------|--------------------------|
| Board CRUD & organization | Maya, Dev, Priya, Admin |
| URL shortening with custom slugs | Maya, Dev, Priya, Kenji |
| Per-board analytics dashboard | Maya, Priya |
| Public board rendering | Priya |
| API (link CRUD, bulk operations) | Dev, Kenji |
| User auth & role management | All |
| Link target updating / redirect preservation | Dev |
| Soft delete / undo | Maya (edge case) |
| Link expiration (TTL) | Kenji |
| Admin workspace management | Admin |
| Shareable board URLs | Maya, Dev, Priya |

## Web Application Specific Requirements

### Project-Type Overview

Linkboard is a single-page application (SPA) with a RESTful API backend. The frontend serves two distinct experiences: (1) an authenticated dashboard for link/board management and analytics, and (2) a public-facing board rendering for unauthenticated viewers. The API backend handles link shortening, redirect resolution, analytics collection, and all CRUD operations.

### Browser Support Matrix

| Browser | Minimum Version | Priority |
|---------|----------------|----------|
| Chrome | Last 2 versions | Primary |
| Firefox | Last 2 versions | Primary |
| Safari | Last 2 versions | Primary (creator audience uses macOS/iOS heavily) |
| Edge | Last 2 versions | Secondary |
| Mobile Safari | iOS 15+ | Primary (public boards viewed on mobile) |
| Mobile Chrome | Android 10+ | Primary |

### Responsive Design Requirements

- **Desktop (1024px+):** Full dashboard layout — sidebar navigation, multi-column board views, analytics charts
- **Tablet (768px-1023px):** Collapsed sidebar, stacked board views, simplified analytics
- **Mobile (< 768px):** Bottom navigation, single-column board views, touch-optimized link management. Public boards must render cleanly — this is where most external traffic lands.
- **Critical:** Public board pages must be mobile-first. Creator audiences share board URLs on social media where 70%+ of clicks come from mobile devices.

### Web Performance Targets

Backend performance targets (redirect latency, API response times) are defined in Non-Functional Requirements. Web-specific frontend targets:

| Metric | Target | Context |
|--------|--------|---------|
| First Contentful Paint | < 1.5s | Public boards load fast for external visitors |
| Time to Interactive | < 3s | Dashboard usable quickly after login |
| Largest Contentful Paint | < 2.5s | Board pages with many links render promptly |
| Core Web Vitals | Pass | SEO and user experience baseline |

### SEO Strategy

- **Public boards are SEO-critical.** They need server-side rendering (SSR) or static generation for crawlability. A public board like `lnkb.rd/b/react-resources` should rank for relevant search terms.
- **Dashboard pages** do not need SEO — they're behind authentication.
- **Short link redirect pages** should NOT be indexed (noindex, nofollow) — they're pass-through.
- **Meta tags:** Public boards need Open Graph and Twitter Card meta tags for rich link previews when shared on social media.

### Accessibility

Target: WCAG 2.1 Level AA compliance. Public boards must be fully accessible — they reach the widest audience including users with assistive technology. Specific accessibility requirements are defined in Non-Functional Requirements (NFR20-NFR24).

### Implementation Considerations

- **SPA Framework:** React-based SPA for dashboard (component reusability, ecosystem maturity)
- **SSR for Public Pages:** Public board pages need server-side rendering for SEO and fast first paint
- **API-First Architecture:** All frontend features consume the same API that's exposed to external developers — no internal-only endpoints
- **Real-Time:** Not required for MVP. Analytics can refresh on page load. Real-time collaborative editing deferred to v3.0.
- **Offline:** Not required for MVP. Links are online-only assets. Progressive enhancement possible in future.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP — ship the smallest thing that validates the core hypothesis: *people will organize and share links through boards rather than treating them as disposable one-off artifacts.*

The MVP answers one question: **Do users actually create boards and share them?** If board creation and sharing rates meet targets (80% of users create a board with 3+ links in first session, 30% share a board within 48h), we've validated the core bet. Everything else is optimization.

**Resource Requirements:** Small full-stack team (2-3 engineers). One backend engineer (API, database, redirect engine), one frontend engineer (SPA dashboard, public board rendering), one full-stack/DevOps for infrastructure and deployment. Design can be handled with a component library (Tailwind + headless UI) — no dedicated designer needed for MVP.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Maya's campaign board workflow (create board → shorten links → view analytics → share)
- Priya's public board curation (create public board → curate links → share URL)
- Dev's team link hub (create boards → organize links → share with team)
- Kenji's API integration (generate API key → create links programmatically)

**Must-Have Capabilities:**

| Capability | Rationale |
|-----------|-----------|
| URL shortening (auto + custom slugs) | Core utility — without this, there's no product |
| Board CRUD with visibility controls | Core differentiator — the board metaphor IS the product |
| Link-to-board assignment | Links without boards = just another shortener |
| User auth (email/password + OAuth) | Access control, personalization |
| Basic analytics (clicks, referrers, geo) | Validates the "analytics + organization" value prop |
| Public board rendering (SSR) | Enables sharing — the viral loop |
| RESTful API v1 with API key auth | Developer persona, automation use case |
| Responsive web UI | Mobile access for public boards is critical for sharing |

**Explicitly Deferred from MVP:**
- Team workspaces / multi-user boards (manual workaround: share board URLs)
- Custom domains (use default short domain)
- Browser extension / CLI (API covers power users)
- Import tools (manual entry sufficient for validation)
- Webhooks / integrations (API enables later)
- Comments / annotations (deferred until teams exist)
- Link-in-bio profile pages (boards serve as proxy)

### Post-MVP Features

**Phase 2 — Growth (Month 4-9):**
- Team workspaces with role-based access (admin/editor/viewer)
- Custom domains with automated SSL provisioning
- CSV and Bitly import tools
- Enhanced analytics (device breakdown, UTM parameter tracking)
- Browser extension (Chrome, Firefox)
- CLI tool for developer workflows
- Billing and subscription management (freemium model)

**Phase 3 — Expansion (Month 10-18):**
- Webhooks and third-party integrations (Zapier, n8n)
- Link-in-bio profile pages for creators
- Comments and annotations on links
- Real-time collaborative board editing
- Native mobile apps (iOS, Android)
- Advanced analytics with AI-powered insights
- Enterprise features: SSO, audit logs, compliance
- Self-hosted distribution (Docker, Helm)
- Public API ecosystem with developer portal

### Risk Mitigation Strategy

**Technical Risks:**
- **Redirect latency at scale:** The < 50ms p99 target requires careful architecture. Mitigation: Redis/in-memory cache for hot links, CDN-level redirect for top-traffic links. Start simple, optimize when traffic demands it.
- **Analytics write throughput:** Every redirect generates an analytics event. Mitigation: Async event pipeline (message queue), don't block redirects on analytics writes. Accept eventual consistency on analytics data.

**Market Risks:**
- **"Just another shortener" perception:** Risk that users don't see the board value and use it as a flat shortener. Mitigation: Onboarding flow guides first board creation, not first link creation. Board-first UX design.
- **Competitive response:** Bitly could add boards, Raindrop could add shortening. Mitigation: Move fast, build community, leverage open-source positioning and self-hostable differentiation.

**Resource Risks:**
- **Smaller team than planned:** If only 1-2 engineers available, cut scope to: shortening + boards + auth + basic analytics. Defer API, public board SSR can be simplified to server-rendered HTML without React SSR complexity.
- **Timeline pressure:** If launch timeline compressed, use a hosted auth service (Clerk, Auth0) instead of building auth, and use a CSS framework with pre-built components to reduce frontend work.

## Functional Requirements

### URL Shortening

- **FR1:** Users can create a short link by providing a target URL
- **FR2:** Users can specify a custom slug for a short link or have one auto-generated
- **FR3:** Users can add metadata to a link (title, description, tags)
- **FR4:** Users can set an optional expiration date/time on a short link
- **FR5:** Users can update the target URL of an existing short link (redirect preservation)
- **FR6:** Users can delete a short link permanently
- **FR7:** Anyone with a short link URL can be redirected to the target destination

### Board Management

- **FR8:** Users can create a board with a name, description, and visibility setting (public, private, unlisted)
- **FR9:** Users can edit board metadata (name, description, visibility)
- **FR10:** Users can delete a board
- **FR11:** Users can add existing links to a board
- **FR12:** Users can remove links from a board without deleting the link itself
- **FR13:** Users can reorder links within a board
- **FR14:** Users can view all links in a board with their metadata
- **FR15:** Anyone with a public or unlisted board URL can view the board and its links without authentication

### Link Analytics

- **FR16:** Users can view total click count for any of their links
- **FR17:** Users can view click counts aggregated by time period (daily, weekly, monthly)
- **FR18:** Users can view top referrer sources for a link
- **FR19:** Users can view geographic distribution of clicks (country-level) for a link
- **FR20:** Users can view aggregate analytics for all links in a board (board-level dashboard)

### User Management

- **FR21:** Visitors can register an account using email and password
- **FR22:** Visitors can register and log in using OAuth providers (GitHub, Google)
- **FR23:** Users can log in and log out of their account
- **FR24:** Users can reset their password via email
- **FR25:** Users can view and edit their profile information
- **FR26:** Users can generate and manage API keys for programmatic access

### Link Library

- **FR27:** Users can view all their links in a personal link library
- **FR28:** Users can search and filter links by title, tags, target URL, or board membership
- **FR29:** Users can view which boards a link belongs to
- **FR30:** Users can create a link and assign it to a board in a single action

### Dashboard

- **FR31:** Users can view a dashboard showing recent links, boards overview, and quick-create actions
- **FR32:** Users can access link creation from the dashboard with board assignment
- **FR33:** Users can navigate between boards, link library, analytics, and account settings

### API Access

- **FR34:** API consumers can create, read, update, and delete links via REST API
- **FR35:** API consumers can create, read, update, and delete boards via REST API
- **FR36:** API consumers can add and remove links from boards via REST API
- **FR37:** API consumers can retrieve analytics data for their links and boards via REST API
- **FR38:** The API enforces rate limiting per API key
- **FR39:** The API provides OpenAPI/Swagger documentation

### Public Board Experience

- **FR40:** Public boards render with server-side rendering for SEO crawlability
- **FR41:** Public boards display Open Graph and Twitter Card meta tags for rich link previews
- **FR42:** Public boards are accessible without authentication and load performantly on mobile devices

## Non-Functional Requirements

### Performance

- **NFR1:** Short link redirects complete in < 50ms at p99 under normal load
- **NFR2:** API responses return in < 200ms at p95
- **NFR3:** Dashboard pages reach First Contentful Paint in < 1.5s
- **NFR4:** Public board pages reach Largest Contentful Paint in < 2.5s
- **NFR5:** The system supports 100 concurrent authenticated users and 1,000 concurrent redirect requests without performance degradation
- **NFR6:** Analytics data is eventually consistent — redirect responses are never blocked by analytics writes

### Security

- **NFR7:** All data in transit is encrypted via TLS 1.2+
- **NFR8:** User passwords are hashed using bcrypt or argon2 (never stored in plaintext)
- **NFR9:** API keys are hashed at rest and only displayed once at creation time
- **NFR10:** Session tokens expire after 24 hours of inactivity
- **NFR11:** All user input is sanitized to prevent XSS, SQL injection, and other injection attacks
- **NFR12:** Rate limiting is enforced on authentication endpoints (max 10 failed attempts per 15 minutes per IP)
- **NFR13:** Users can only access, modify, and delete their own links, boards, and analytics data
- **NFR14:** OAuth tokens are stored securely and refreshed according to provider best practices
- **NFR15:** Custom slugs are validated to prevent abuse (no reserved words, no misleading slugs)

### Scalability

- **NFR16:** The redirect engine scales horizontally — adding instances increases redirect throughput linearly
- **NFR17:** The system supports 1M link redirects per month within the first year without architectural changes
- **NFR18:** Database queries for redirect resolution use indexed lookups with O(1) complexity
- **NFR19:** Analytics ingestion pipeline handles traffic spikes of 10x normal volume without data loss

### Accessibility

- **NFR20:** The application meets WCAG 2.1 Level AA compliance across all authenticated views
- **NFR21:** Public board pages meet WCAG 2.1 Level AA compliance
- **NFR22:** All interactive elements are keyboard-navigable with visible focus indicators
- **NFR23:** Analytics charts provide text alternatives for screen reader users
- **NFR24:** Color is not used as the sole means of conveying information (color contrast ratio minimum 4.5:1 for text)
