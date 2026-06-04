# Active Feature

Single source of truth for what is being built right now. Claude reads this at the
start of a task and keeps the "Now building" block current. When a feature is done,
move a one-line entry into History and clear the block for the next one.

---

## Now building

- **Feature:** Google login via NextAuth (issue #1, entry point of the user flow)
- **Scope:** NextAuth v5 + Google OAuth + Prisma adapter (database sessions). Login
  page, sign-out, server-side route guard on `/dashboard`. Minimal placeholder
  dashboard (real dashboard is #2).
- **Acceptance:** Google sign-in creates/links a `User` + `Session`; protected
  routes redirect unauthenticated users to `/login`; sign-out clears the session;
  `pnpm build` passes; verified in browser.
- **Branch:** `feature/google-auth`
- **Notes:** Route protection is server-side (Prisma can't run in Edge middleware).
  `session.user.id` exposure deferred to #2 where it's needed.

---

## History

- 2026-06-04  Phase 4 foundation: monorepo, deps, shared `@mockmate/db` package  ✓
- 2026-06-04  Installed Zod 4 + initialized shadcn/ui (button, sonner toast)  ✓
