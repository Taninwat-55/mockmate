# Active Feature

Single source of truth for what is being built right now. Claude reads this at the
start of a task and keeps the "Now building" block current. When a feature is done,
move a one-line entry into History and clear the block for the next one.

---

## Now building

- **#4 Interactive multi-turn chat session (streaming).** Replace the placeholder
  `/interview/[id]` with the live §6 loop. New streaming API route
  (`POST /api/interview/[id]`) drives the loop: save the answer to the DB before the
  LLM call, judge weakness, `determineNextAction` to ask a follow-up / advance / end,
  log a hidden evaluation note per finished main question, end at 5 questions or on
  "End Interview Early". `streamText().toUIMessageStreamResponse()` + `useChat`
  (`@ai-sdk/react`, v6). Opening question seeded by a `startInterview` Server Action.
  Server-side 2,000-char cap; error/retry/timeout per PRD §7 (`maxRetries: 2`).
  - **Acceptance:** AI asks 5 JD/resume-grounded questions one at a time; follows up
    ≤2× on weak/short (<40-word) answers, then marks the question unresolved and moves
    on; tokens stream live; every exchange persists `Question`/`Message` rows and
    updates `mainQuestionCount`/`lastActiveAt`; reload rehydrates the transcript from
    the DB; completion (5 questions or End Early) flips the session to `COMPLETED` and
    shows an in-page complete state. Grading matrix + feedback page are #5.

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
