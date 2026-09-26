# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is a pnpm + Turborepo monorepo. All commands should be run from the repo root unless targeting a specific workspace.

```
mockmate/
├── apps/
│   ├── web/        ← Next.js app (all MVP work happens here)
│   └── mobile/     ← Placeholder, not yet scaffolded
├── packages/
│   └── db/         ← Shared Prisma package: schema, client singleton, types
├── turbo.json
└── pnpm-workspace.yaml
```

Node is pinned via `.nvmrc` (24) and `engines`. pnpm is pinned via `packageManager` (Corepack enforces it). There is exactly ONE lockfile, at the root — never commit a nested `pnpm-lock.yaml`.

## Commands

All run from repo root:

```bash
pnpm dev          # start Next.js dev server (apps/web only currently)
pnpm build        # build all workspaces via Turborepo
pnpm lint         # lint all workspaces
```

Database (run from root, delegates to the `@mockmate/db` workspace):

```bash
pnpm db:generate   # regenerate Prisma client after editing the schema
pnpm db:push       # push schema to Neon DB (dev, no migration history)
pnpm db:migrate    # create + apply a migration
pnpm db:studio     # open Prisma Studio GUI
```

These map to `prisma` commands run inside `packages/db`. If you ever need to call the Prisma binary directly, run it from `packages/db` (that's where the schema and `prisma.config.ts` live), and use `./node_modules/.bin/prisma` rather than `pnpm prisma` to avoid the dep-status check.

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 App Router | API routes + UI in one deploy, streaming support |
| Database | Neon PostgreSQL + Prisma v7 | Serverless Postgres, type-safe queries |
| Auth | NextAuth v5 beta + Google OAuth | Google-only for MVP, no password storage |
| AI | Vercel AI SDK + `@ai-sdk/google` | Provider abstraction — swap Gemini for GPT/Claude by changing one import |
| LLM | Google Gemini, tiered per session (`lib/ai.ts`) | Free: 2.5 Flash. Paid: 3.5 Flash chat + 2.5 Pro grading |
| Analytics | PostHog | Events: `session_started`, `session_completed`, `feedback_rated` |
| Email | Resend (HTTP API) via Next.js `after()` | Async post-session summary for paid sessions, non-blocking — no AWS (#54) |
| Styling | Tailwind v4 + PostCSS | PostCSS required by Next.js; not needed in Vite-based projects |

## Key Architecture Rules

**Never call the Gemini SDK directly.** All LLM calls go through Vercel AI SDK (`import { streamText, generateObject } from 'ai'`). Provider-specific imports are only `@ai-sdk/google`. See `docs/decisions/002-vercel-ai-sdk-abstraction.md`.

**Save the user's answer to DB before calling the LLM.** If the LLM call fails or times out, the answer must not be lost. The DB write happens first, always.

**Grading uses `evaluationNote` fields, not the conversation.** After each question, the AI appends a hidden evaluation note to the Question record. The final grading matrix is generated from those 5 notes — not by re-reading the full message history.

**`Session` ≠ `InterviewSession`.** The Prisma schema has both. `Session` is NextAuth's auth cookie table (do not rename). `InterviewSession` is the application's interview record.

## Coding Standards

**TypeScript**
- `strict` is on. No `any` — use a proper type, or `unknown` and narrow.
- Define interfaces/types for component props, API responses, and data shapes. Let inference handle the obvious; add explicit types where they aid clarity.

**React / Next.js (App Router)**
- Server Components by default. Add `"use client"` only for interactivity, hooks, or browser APIs — push it to the leaves of the tree, not whole pages.
- **Server Actions** for form submissions and simple mutations.
- **API Routes** for: the AI streaming endpoints, webhooks (Stripe etc.), long-running operations, responses needing specific status/headers, and any endpoint a future mobile/CLI client will call.
- Functional components only. Extract reusable logic into custom hooks. One job per component.

**File organization** (inside `apps/web/src/`)
- Components: `components/<feature>/ComponentName.tsx`
- Pages: `app/<route>/page.tsx`
- Server Actions: `actions/<feature>.ts`
- Types: `types/<feature>.ts`
- Utils/helpers: `lib/<utility>.ts`

**Naming**
- Components & types/interfaces: `PascalCase` (no `I` prefix). Functions: `camelCase`. Constants: `SCREAMING_SNAKE_CASE`. Files: match the component name, else `kebab-case`.

**Styling**
- Tailwind for all styling. No inline styles.
- **Shadcn/ui** for components (install when the first real UI is built); use its `sonner` for toasts.
- Light mode first, dark mode as an option.

**Validation — Zod**
- Validate all external input with Zod: Server Action inputs, API route bodies, and LLM structured output (`generateObject` schema for the grading matrix).

**Data fetching**
- Server Components read directly via `prisma` from `@mockmate/db`. Client Components mutate via Server Actions — never call Prisma from the client.

**Error handling (Server Actions)**
- Wrap in `try/catch`. Return a `{ success, data?, error? }` shape. Surface failures to the user via a toast, not a thrown error.

**Database workflow (phased — we are in phase 2 as of #29)**
1. **Phase 1 (done — local prototyping):** `pnpm db:push` — fast schema iteration, no migration files while the schema was still churning and there was no real data.
2. **Phase 2 (now):** `pnpm db:migrate` (`migrate dev`) — schema changes are version-controlled history. History was baselined at `0_init` (the pre-#29 schema) and the first real migration is `add_saved_resume`. Run `prisma migrate status` before committing to confirm sync.
3. **Production:** migrations are **not** applied automatically (the Vercel build does not run them). Release steps for a release that contains a migration:
   1. Create a Neon backup branch of `production` (e.g. `backup-pre-vX.Y.Z`, set to expire in 1 day).
   2. Put the production `DATABASE_URL` in `apps/web/.env.production.local` (gitignored), run `prisma migrate status`, then `prisma migrate deploy` from `packages/db` with that URL exported.
   3. Immediately merge the release PR `develop` → `main` (**merge commit, not squash**, so the branches stay connected).
   4. Smoke test on mockmate.space, tag the release (`vX.Y.Z`), delete `.env.production.local`.

**Databases (Neon branches):** `production` backs the live site only (Vercel Production `DATABASE_URL`). `dev` backs local development (`apps/web/.env.local`) **and** Vercel Preview deployments. Never point local or preview at `production`.

`prisma migrate dev` is interactive and fails in non-interactive shells. There, write the migration SQL by hand (`migrations/<timestamp>_<name>/migration.sql`) and apply it with `migrate deploy`. Always hand-write renames as `RENAME COLUMN` — Prisma's generated SQL drops and re-adds the column, losing data.

**Code quality**
- ESLint enforces no-unused and similar — fix warnings, don't suppress them. Avoid leaving commented-out code. Keep functions and components small and focused.

## Working Agreement

(Project-specific process. General behavior — ask before delete/edit/create, be concise, be honest — is already covered by the global config and not repeated here.)

**Scope discipline**
- Build only what the current task / spec asks for. No nice-to-have features, no unrequested refactors.
- Make the minimal diff that does the job. Preserve existing patterns in the codebase.
- If a non-obvious decision is made, explain it briefly.

**When stuck**
- If something isn't working after 2–3 attempts, stop and explain the problem. Don't keep trying random fixes. Ask if requirements are unclear.

**Branching** (see `docs/project-management.md` for the full model)
- `main` = production (protected), `develop` = integration. Branch task work off `develop`.
- One branch per feature/fix: `feature/<name>` or `fix/<name>`.
- PR into `develop`, not `main`. Releases are a separate PR `develop` → `main`.
- Ask before deleting a branch after merge.

**Commits**
- Ask before committing — never auto-commit. Commit only after `pnpm build` passes and the change works.
- Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, etc.
- One focused change per commit.
- No Claude attribution in commit messages (no "Generated with Claude", no `Co-Authored-By` trailer).

**Process discipline — issue-first rule**

Nothing gets built without a GitHub issue. Before any implementation starts, Nina checks:
1. Is there an open issue for this work? If not → remind Ice, offer to create one first.
2. Does the issue have acceptance criteria and labels? If not → flag it as not Ready.
3. Is there already something In Progress? If yes → flag the WIP limit (max 2).

If Ice explicitly chooses to skip the process ("just do it"), Nina:
- Flags it once as a **process deviation** ("Heads up — proceeding without an issue, this is unplanned work.")
- Notes the reason briefly in the commit message (e.g. `chore: hotfix X — unplanned, no issue`)
- Suggests creating a retroactive issue afterward to keep the history clean

This is not a blocker — it's a habit gate. The goal is to build the muscle memory of how real teams work, not to add friction for its own sake.

**Per-feature workflow**
1. Open a GitHub issue (title, labels, milestone, acceptance criteria).
2. Write the feature into `docs/active-feature.md` (scope + acceptance).
3. Create the branch off `develop` (`feature/<name>` or `fix/<name>`).
4. Implement it.
5. Verify in the browser; run `pnpm build` and fix any errors. (Unit tests come later.)
6. Iterate as needed.
7. Commit only after build passes and it works — with permission.
8. Open a PR into `develop`; merge once CI is green.
9. Delete the branch after merge (ask first).
10. Move the entry to History in `docs/active-feature.md`.

**Code review (periodic / on demand)**
When reviewing AI-generated code, check: security (auth checks, input validation), performance (unnecessary re-renders, N+1 queries), edge cases, and whether it matches existing patterns.

## Database Access

The Prisma client is a shared workspace package. **Always import from `@mockmate/db`, never from `@prisma/client` directly** — the package re-exports all Prisma types and enums, and exposes a singleton client (prevents connection-pool exhaustion under Next.js hot reload).

```typescript
import { prisma, type User, InterviewSessionStatus } from '@mockmate/db'

const sessions = await prisma.interviewSession.findMany({
  where: { userId, status: InterviewSessionStatus.IN_PROGRESS },
})
```

- Schema: `packages/db/prisma/schema.prisma`
- Datasource URL: `packages/db/prisma.config.ts` (Prisma v7 — not in the schema file). It loads `apps/web/.env.local` so there's a single source of truth for `DATABASE_URL`.
- Client singleton + type re-exports: `packages/db/src/index.ts`
- `apps/web/next.config.ts` lists `@mockmate/db` in `transpilePackages` so Next can consume the package's raw TypeScript.

Core model chain: `User → InterviewSession → Question → Message`
Feedback is a 1:1 on `InterviewSession`, created only on COMPLETED sessions.

Key constraints from the entity model:
- Max 5 `Question` records per `InterviewSession` (`mainQuestionCount` tracks this)
- Max 2 follow-ups per `Question` (`followupCount`)
- `Question.status` → `UNRESOLVED` if both follow-ups are exhausted without a good answer
- `lastActiveAt` on `InterviewSession` is updated on every exchange — the Vercel Cron uses it to find sessions to abandon (IN_PROGRESS older than 24h → ABANDONED)

## Session Lifecycle

`IN_PROGRESS` → `COMPLETED` (5 questions done or user exits early)
`IN_PROGRESS` → `ABANDONED` (Vercel Cron, daily at midnight, 24h threshold)

On `COMPLETED`: for paid sessions, the feedback route schedules the summary email with `after()` (`lib/session-summary-email.ts`, Resend). It runs after the response is sent, so the feedback page never waits for it or breaks on it.

## AI Interaction Patterns

**Streaming responses** (`streamText`) — used for interview exchanges. Return `result.toUIMessageStreamResponse()` from the API route; use `useChat` hook on the frontend.

**Structured JSON output** (`generateObject` with Zod schema) — used for the grading matrix. The LLM returns the full `Feedback` shape as validated JSON.

**Error handling**: 5s timeout triggers retry UI. 429/5xx → exponential backoff (1s, 2s, 4s, 3 attempts max). After 3 failures, show toast and retry button. User input is never lost because it was already written to DB.

## Environment Variables

All in `apps/web/.env.local`:

```
DATABASE_URL=           # Neon connection string
AUTH_URL=               # Base URL — http://localhost:3000 locally, https://mockmate.space in production (NextAuth v5)
NEXTAUTH_SECRET=        # Random string for NextAuth
GOOGLE_CLIENT_ID=       # Google OAuth
GOOGLE_CLIENT_SECRET=   # Google OAuth
GOOGLE_GENERATIVE_AI_API_KEY=  # Gemini API
POSTHOG_KEY=            # PostHog project key
RESEND_API_KEY=         # Resend email — post-session summary (paid sessions)
CRON_SECRET=            # Secret token checked by the Vercel Cron route
STRIPE_SECRET_KEY=      # Stripe API key (sandbox locally)
STRIPE_WEBHOOK_SECRET=  # Verifies /api/stripe/webhook events
STRIPE_PRICE_SINGLE=    # Price ID, 1 credit (19 DKK)
STRIPE_PRICE_FIVE=      # Price ID, 5 credits (79 DKK)
```

## Phase 2 (Not yet built)

Do not implement these unless explicitly asked: **S3/CloudFront-backed** PDF resume storage, audio recording (Whisper), multiple AI personas.

> Note: pay-per-use billing already shipped in #16 (credits on `User`, Stripe one-time Checkout + webhook, session gating). Stripe live activation is tracked in #40.

> Note: a scoped-down, text-only CV upload already shipped in #29 — the PDF is parsed to plain text **client-side** and only the text is stored (`User.savedResume`), no file storage. Phase 2's PDF item refers specifically to the heavier S3/CloudFront file-storage version.

## Reference Docs

- `docs/active-feature.md` — what's being built right now; keep it current (see Working Agreement)
- `docs/project-management.md` — branching model, versioning, CI, Kanban/PM process
- `docs/PRD.md` — product requirements: problem, persona, scope, success metrics, AI behavior rules
- `docs/architecture/system-architecture.md` — full system diagram and data flows
- `docs/entity-model.md` — full field definitions and design rationale
- `docs/user-flow.md` — all user paths including error states and retry logic
- `docs/decisions/` — ADRs for LLM provider, AI SDK, session persistence, cleanup strategy, plain text input
