# Active Feature

Single source of truth for what is being built right now. Claude reads this at the
start of a task and keeps the "Now building" block current. When a feature is done,
move a one-line entry into History and clear the block for the next one.

---

## Now building

- **#46 multi-stage interviews**, part 1 of 3: **#72 stage-aware foundation** (`feature/stage-foundation`)
  - Scope: `Stage`/`StageVerdict` enums, `InterviewSession.stages` + `roundEndedAt`,
    `Question.stage`, `StageResult` (defaults backfill every session as one
    HIRING_MANAGER round); `STAGE_PLANS`, `stageProgress`, `END_STAGE`;
    `renderSystemPrompt` + directives take round progress; progress indicator in the
    chat. Free path frozen by `pnpm --filter web eval:check`.
  - Next: #73 (the loop, owner-only), #74 (rollout to paid). Plan recorded on #46.

---

## History

- 2026-09-28  Role + company fields (#65, PR #69): optional `InterviewSession.company`
  (migration), separate form field, `interviewTitle()` "Role at Company" across UI and
  email; prompts use the company and never invent one; feedback written to "you",
  never he/she. Ships in the next release.  ✓

- 2026-09-28  Release **v0.3.0** (PR #68, tagged): #52 model tiers + daily free cap,
  #63 honest grading. Both migrations applied to production before the merge;
  main/develop reconciled in #67 after the squashed #62.  ✓

- 2026-09-28  Question count + honest grading (#63, PR #66): directives carry "main
  question N of 5"; fewer than 3 answered questions → `INCOMPLETE` ("Not enough to
  judge"), enforced in code and at display time; anchored grading rubric + code
  guard on STRONG_HIRE; generic answers and rambling graded down. Eval harness
  (`apps/web/scripts/interview-eval`): 6th questions 5/21 → 0/21, 2-answer early
  exit Strong Hire → Not enough to judge.  ✓

- 2026-09-28  Model tiers per plan + daily free cap (#52, PR #64): `ModelTier`
  (FREE/PAID/MAX) on `InterviewSession`, one tier map in `lib/ai.ts`; all tiers on
  3.8 Flash live, paid thinks deeper on eval notes, owner MAX grades with 3.1 Pro.
  Owner Free/Pro/Max picker + tier badge. 100 free sessions/UTC day, checked before
  the weekly free is claimed. Side-by-side test (25 sessions) in the PR.  ✓

- 2026-09-26  End Early silent failure (#58, PR #59): thrown Server Action errors
  (stale action ID after a deploy, network) now toast in all 5 client-side calls;
  `createInterviewSession` rethrows its success redirect via `unstable_rethrow`.  ✓

- 2026-09-24  Email via Resend, AWS Lambda removed (#54, PR #55): paid-session summary
  email sent from the feedback route with `after()` via Resend's HTTP API
  (`lib/session-summary-email.ts`), now HTML-escaped; `lambda/`, the AWS SDK and AWS
  env vars removed. Released with #44 as **v0.2.0** (PR #56), prod migration applied.  ✓

- 2026-09-24  Any-role support + interview context options (#44, PR #53): role with
  example chips, seniority / work setting / employment type chips, CV + job posting
  optional; role-neutral prompts calibrated by level (`lib/interview-context.ts`);
  Feedback `technicalAccuracy*` → `roleKnowledge*` via hand-written RENAME migration;
  fixed evaluation notes leaking into interviewer replies; copy + PRD repositioned.
  Verified on a Neon `dev` branch (barista / nurse / frontend). Remaining: prod
  migration at release.  ✓

- 2026-09-24  Hotfix (#48, PR #49, released in #51): Gemini thinking tokens were
  truncating AI output under the #42 caps; `outputLimits()` bounds thinking per call.  ✓

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
