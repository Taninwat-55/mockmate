# Active Feature

Single source of truth for what is being built right now. Claude reads this at the
start of a task and keeps the "Now building" block current. When a feature is done,
move a one-line entry into History and clear the block for the next one.

---

## Now building

- **Feature:** Resume + JD input (issue #2, plain text saved to DB)
- **Scope:** Replace the placeholder `/dashboard` with a protected form — a short
  title/role input plus two textareas (resume, job description) and a "Start
  Interview" button. A Server Action validates with Zod, enforces server-side caps
  (resume and JD each ≤ 6,000 chars), creates an `InterviewSession` (status
  `IN_PROGRESS`) scoped to the signed-in user, then routes to a placeholder
  `/interview/[id]` screen (the chat itself is #4). Exposes `session.user.id` via
  the NextAuth session callback.
- **Acceptance:** A signed-in user can submit the form; an `InterviewSession` row
  is created with their `userId`, title, resume, and JD; overflow/empty input is
  rejected with a clear toast (not a thrown error); the user lands on
  `/interview/[id]`; `pnpm build` and `pnpm lint` pass; verified in browser.
- **Branch:** `feature/resume-jd-input`
- **Notes:** Schema requires `InterviewSession.title`, so a small title input was
  added on top of the two textareas (chosen over auto-deriving from the JD) — it
  matches the schema's intent and gives clean labels for Session History (#7).

---

## History

- 2026-06-04  Phase 4 foundation: monorepo, deps, shared `@mockmate/db` package  ✓
- 2026-06-04  Installed Zod 4 + initialized shadcn/ui (button, sonner toast)  ✓
- 2026-06-04  Google login via NextAuth (#1): Google OAuth + Prisma DB sessions,
  login/sign-out, server-side `/dashboard` route guard  ✓
