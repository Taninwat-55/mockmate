# Active Feature

Single source of truth for what is being built right now. Claude reads this at the
start of a task and keeps the "Now building" block current. When a feature is done,
move a one-line entry into History and clear the block for the next one.

---

## Now building

**#9 — Session abandonment Vercel Cron (24h → ABANDONED) (P2)**

- `GET /api/cron/abandon-sessions`: protected by `CRON_SECRET` Bearer token, runs `updateMany` on `IN_PROGRESS` sessions with `lastActiveAt < now - 24h` → sets status to `ABANDONED`.
- `vercel.json` at repo root registers the cron to run daily at midnight UTC (`0 0 * * *`).
- `CRON_SECRET` added to env var list in CLAUDE.md.

---

## History

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
