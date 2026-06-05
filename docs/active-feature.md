# Active Feature

Single source of truth for what is being built right now. Claude reads this at the
start of a task and keeps the "Now building" block current. When a feature is done,
move a one-line entry into History and clear the block for the next one.

---

## Now building

**Issue #5 — Structured grading matrix + feedback page (P0)**

After a session reaches COMPLETED, generate the grading matrix from the 5 `evaluationNote` fields
(not the message history) via `generateObject` + Zod schema. Persist as a `Feedback` row (1:1 on
`InterviewSession`). Render `/interview/[id]/feedback`: signal badge, 3 dimension cards
(score + strength/weakness/tip), overall summary, user rating widget. Grading is idempotent — if
`Feedback` already exists, serve the cached row. Error handling: toast + retry on `generateObject`
failure, session data never lost.

---

## History

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
