# Active Feature

Single source of truth for what is being built right now. Claude reads this at the
start of a task and keeps the "Now building" block current. When a feature is done,
move a one-line entry into History and clear the block for the next one.

---

## Now building

- _Nothing in flight — pick the next issue from the board (Ready column)._

---

## History

- 2026-06-13  Pay-per-use billing + per-session model tiering (#16): credit model on
  `User` (`creditBalance`, `freeSessionRefreshAt`, `isOwner`) + `InterviewSession.isPaid`
  + `CreditPurchase` ledger; removed the `subscriptionStatus` stub. Stripe one-time
  Checkout (`/api/stripe/checkout`) + idempotent webhook fulfilment
  (`/api/stripe/webhook`, unique `stripeSessionId`). `/buy` + `/buy/success` pages.
  Session gating in `createInterviewSession`: credit-first / weekly-free / block, with a
  dashboard free-vs-credit choice when both are available, all in one Prisma
  transaction. Per-session models (`lib/ai.ts`): free = 2.5 Flash everywhere; paid =
  3.5 Flash chat + 2.5 Pro grading. Email summary + full history gated to paid; free
  history capped at 3. Credit refund when a paid session is auto-abandoned (cron).
  `isOwner` bypass (unlimited Pro, never charged) surfaced on dashboard/settings;
  Pro/Free badge in the interview header. Pricing 19/79 DKK across landing, about,
  settings, and buy. Verified end-to-end in Stripe sandbox (test card → webhook →
  credit grant → spend → Pro session). Remaining: Stripe live activation + prod deploy
  (go-live).  ✓

- 2026-06-05  SEO + GEO + marketing (#31): root + per-page metadata (metadataBase,
  title template, OG/Twitter, canonicals), `noindex` on dashboard/settings/interview,
  `robots.ts` + `sitemap.ts` (public pages only). Adopted the monochrome terminal
  `>_` mark — `Logo` in nav/footer, code-generated `opengraph-image`/`twitter-image`,
  and `icon.svg`/`favicon.ico`/`apple-icon`/manifest icons. JSON-LD on landing
  (WebSite, Organization, SoftwareApplication with DKK offers + no faked rating,
  FAQPage from the `faqs` array). GEO: "What is MockMate" block + dedicated `/about`.
  Extras: `public/llms.txt`, `app/manifest.ts`. Remaining manual step (Ice): GSC
  domain verification + sitemap submission post-deploy.  ✓

- 2026-06-05  PDF upload + saved CV (#29): "Upload PDF" button on the interview
  form parses the file to plain text **client-side** (pdfjs-dist, no file stored),
  fills the resume textarea, and saves the text to `User.savedResume` via the
  `updateSavedResume` Server Action. New sessions pre-fill the textarea from the
  saved CV with a "Using saved CV — paste to override" hint. Text-only MVP — not
  the S3-backed Phase-2 version. DB moved to migrate history (baselined `0_init` +
  `add_saved_resume`). Upload hardened: 10 MB size guard, `.pdf`-extension
  fallback for empty MIME, length-aware over-6,000-char message.  ✓

- 2026-06-05  Settings page (#30): auth-guarded `/settings` with Profile (editable
  display name via Server Action, read-only Google email + avatar), Billing (Free
  plan, real weekly free-session usage + reset countdown, disabled "Buy credits"
  stub — credit model per `monetization.md`, not Pro), and Danger zone
  (type-to-confirm delete account, cascades all data). Dashboard avatar dropdown
  (`UserMenu`) → Settings / Sign out. New Base UI primitives: avatar, card, label,
  dialog, dropdown-menu.  ✓

- 2026-06-05  PostHog analytics (#23): server-side Node SDK singleton, `session_started` on session create, `session_completed` on 5-question finish and End Early, `feedback_rated` on star rating — all fire-and-forget, no client-side snippet  ✓

- 2026-06-05  Landing page — hero, how-it-works, why-it-works, sample report, pricing (credit model), FAQ (#22) ✓

- 2026-06-05  Session abandonment Vercel Cron (#9): `GET /api/cron/abandon-sessions` protected by `CRON_SECRET`, `updateMany` flips stale `IN_PROGRESS` → `ABANDONED`; `vercel.json` registers daily at midnight UTC  ✓

- 2026-06-05  AI error handling: retry + exponential backoff (#8): `judgeAnswerWeak` wrapped in try/catch returns structured 503 after SDK retries exhausted; `generateEvaluationNote` gets `maxRetries: 2`; client error handling (toast, 5s timeout, Retry button) already in place from #4  ✓

- 2026-06-05  Session persistence + resume-unfinished banner (#7): `ResumeBanner` async Server Component queries most-recent IN_PROGRESS session by `lastActiveAt` desc, renders amber callout above the form with "Resume interview →" link, returns null when clean  ✓

- 2026-06-05  Session history on dashboard (#6): Server Component reads user's `InterviewSession` records via Prisma, renders status badges (COMPLETED/ABANDONED/IN_PROGRESS), COMPLETED rows link to feedback page, empty state shown  ✓

- 2026-06-05  Structured grading matrix + feedback page (#5): `generateObject` + Zod schema from
  5 evaluationNotes, `Feedback` row persisted, `/interview/[id]/feedback` renders signal badge +
  3 dimension cards + rating widget, idempotent with AbortController race fix  ✓
- 2026-06-05  Interactive multi-turn chat session (#4): streaming API route
  (`POST /api/interview/[id]`), `InterviewChat` client component, §6 loop (5 questions,
  ≤2 follow-ups, unresolved marking, hidden eval notes), DB writes before LLM call,
  COMPLETED state + End Early button, transcript rehydrated on reload  ✓
- 2026-06-04  AI interviewer persona + §6 behavior rules (#3): immutable system
  prompt with prompt-injection partitioning, pure question/follow-up/unresolved
  state machine, hidden evaluation-note schema + `generateEvaluationNote`
  (`generateObject`), and a single Vercel AI SDK model-config entry point  ✓
- 2026-06-04  Resume + JD input (#2): protected `/dashboard` form (title + resume +
  JD), Zod-validated with 6,000-char caps, Server Action creates an `IN_PROGRESS`
  `InterviewSession` scoped to `session.user.id`, routes to `/interview/[id]`  ✓
- 2026-06-04  Phase 4 foundation: monorepo, deps, shared `@mockmate/db` package  ✓
- 2026-06-04  Installed Zod 4 + initialized shadcn/ui (button, sonner toast)  ✓
- 2026-06-04  Google login via NextAuth (#1): Google OAuth + Prisma DB sessions,
  login/sign-out, server-side `/dashboard` route guard  ✓
