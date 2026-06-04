# Active Feature

Single source of truth for what is being built right now. Claude reads this at the
start of a task and keeps the "Now building" block current. When a feature is done,
move a one-line entry into History and clear the block for the next one.

---

## Now building

- **Feature:** AI interviewer persona + system prompt & behavior rules (issue #3, P0)
- **Scope:** The non-streaming foundation for the chat (the live chat UI is #4).
  Build reviewable modules under `apps/web/src/`, no UI:
  - `lib/ai.ts` — single model-config entry point (`@ai-sdk/google`,
    `gemini-2.5-flash`) so every LLM call goes through the Vercel AI SDK.
  - `lib/interviewer-prompt.ts` — immutable `INTERVIEWER_SYSTEM_PROMPT` encoding
    PRD §6 (senior-engineer technical screen; exactly 5 main questions; max 2
    follow-ups, triggered by vague / under-40-words / no relevant concept, with a
    light hint on follow-up 2; mark UNRESOLVED + move on after 2 weak follow-ups;
    hidden per-question evaluation note). Plus `buildContextMessage` and
    `buildInterviewMessages` — resume/JD always go in a `user` message, never the
    system prompt (prompt-injection partitioning, ADR-002).
  - `lib/interview-engine.ts` — pure, testable §6 helpers: question/follow-up
    counting, the `determineNextAction` state machine, and unresolved logic.
  - `types/interview.ts` — Zod `evaluationNoteSchema` (for `generateObject`) +
    supporting types.
  - `lib/evaluate-answer.ts` — non-streaming `generateEvaluationNote()` via
    `generateObject`; returns the validated note (DB persistence is #4).
- **Acceptance:** system-prompt module encodes §6 and is unit-reviewable;
  counting/unresolved helpers match §6; hidden evaluation note generated per main
  question; all LLM calls go through the Vercel AI SDK (never the Gemini SDK);
  `pnpm build` and `pnpm lint` pass.
- **Branch:** `feature/interviewer-prompt`
- **Notes:** No test runner added (CLAUDE.md: "tests come later") — helpers are
  written as pure functions so they're trivially testable later. Streaming chat,
  question/follow-up generation calls, and DB persistence of messages/notes are #4.

---

## History

- 2026-06-04  Resume + JD input (#2): protected `/dashboard` form (title + resume +
  JD), Zod-validated with 6,000-char caps, Server Action creates an `IN_PROGRESS`
  `InterviewSession` scoped to `session.user.id`, routes to `/interview/[id]`  ✓
- 2026-06-04  Phase 4 foundation: monorepo, deps, shared `@mockmate/db` package  ✓
- 2026-06-04  Installed Zod 4 + initialized shadcn/ui (button, sonner toast)  ✓
- 2026-06-04  Google login via NextAuth (#1): Google OAuth + Prisma DB sessions,
  login/sign-out, server-side `/dashboard` route guard  ✓
