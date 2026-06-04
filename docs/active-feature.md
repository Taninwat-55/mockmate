# Active Feature

Single source of truth for what is being built right now. Claude reads this at the
start of a task and keeps the "Now building" block current. When a feature is done,
move a one-line entry into History and clear the block for the next one.

---

## Now building

- _Nothing in progress — pick up the next card (issue #4: interactive chat session)._

---

## History

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
