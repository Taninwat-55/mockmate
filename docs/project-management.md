# Project Management, Branching & Versioning

**Status:** Active — adopted 2026-06-04 (start of Phase 4 development)

This is the operating plan for how MockMate is built and shipped. It mimics a real
production team's workflow, scaled down for a solo developer wearing PM, product
owner, and engineer hats. The day-to-day code rules live in `CLAUDE.md`
(Working Agreement); this doc covers the surrounding process.

---

## 1. Branching Model

A trimmed Git Flow: one production line, one integration line, short-lived task branches.

| Branch | Role | Deploys to (once Vercel is connected) |
|---|---|---|
| `main` | Production. Always shippable. Protected. | Vercel production |
| `develop` | Integration / staging. Default branch for daily work. | Vercel staging |
| `feature/<name>` | One feature, branched off `develop` | Vercel preview (per PR) |
| `fix/<name>` | One bug fix, branched off `develop` | Vercel preview (per PR) |

**Flow:**
1. Branch off `develop` → `feature/<name>`.
2. Open a PR into `develop`. Vercel builds a preview; CI runs.
3. Merge into `develop` when green.
4. When a batch of work is ready to ship, open a PR `develop` → `main` = a **release**.
5. Tag the release on `main` (see Versioning).

---

## 2. Branch Protection (solo-adjusted)

On `main`:
- ✅ Require a pull request before merging
- ✅ Required approvals: **0** (solo — requiring approvals would lock you out of your own repo)
- ✅ Require status checks to pass — the CI build check (added once CI exists)
- ⬜ Enforce for administrators: off for now (turn on later for stricter discipline)

Same rules can later be applied to `develop` if desired.

---

## 3. CI (Continuous Integration)

A GitHub Actions workflow runs on every PR so the branch-protection status check has
something to verify. Minimum pipeline:

1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm build`

This is the first task of the next session — branch protection's "require status
checks" is meaningless until this exists.

---

## 4. Versioning

**Semantic Versioning** — `vMAJOR.MINOR.PATCH`:
- **MAJOR** — breaking changes (stays at 0 during MVP)
- **MINOR** — new features (`feat:` commits)
- **PATCH** — fixes (`fix:` commits)

- Start at **`v0.1.0`** (pre-1.0 = MVP, API/UX can still change freely).
- Tag each release on `main`: `git tag v0.1.0 && git push origin v0.1.0`.
- Conventional Commits (already adopted) map cleanly to version bumps and can later
  drive an automated CHANGELOG (e.g. changesets) — not needed yet.

---

## 5. Deployment Environments

Mapped to branches once the repo is connected to Vercel:
- `main` → production domain
- `develop` → staging domain (Vercel preview with an assigned domain)
- Every PR → its own ephemeral preview URL

Not wired yet — set up when the first deploy happens.

---

## 6. Project Management — Kanban, not full Scrum

Solo development uses **Kanban** (flow-based), not Scrum ceremonies (sprints,
standups, retros) which exist to coordinate a team. We borrow Scrum's useful
*artifacts* — a prioritized backlog and a definition of done — without the meetings.

**Board:** GitHub Projects (Kanban template).
Columns: **Backlog → Ready → In Progress → In Review → Done**
- *Backlog* — everything not yet started
- *Ready* — scoped and pickable
- *In Progress* — actively being built (keep WIP low: 1–2 items)
- *In Review* — PR open
- *Done* — merged

**Labels:** `feature`, `fix`, `chore`, `docs` + priority (`P0`, `P1`, `P2`).

**Milestones:** map to phases — `MVP (Phase 1)` holds the launch-critical features.

**Definition of Done:** build passes, works in the browser, merged to `develop`,
card moved to Done, entry logged in `docs/active-feature.md`.

---

## 7. Issue Conventions

- One issue per feature/fix; title is a short outcome (e.g. "Google login via NextAuth").
- Label it, assign a priority, attach to the `MVP (Phase 1)` milestone.
- The issue is the *what/why*; `docs/active-feature.md` tracks the *currently building* one.

---

## 8. Next-Session Task List

1. **CI:** add `.github/workflows/ci.yml` (install + lint + build on PRs).
2. **Branch protection:** require status checks (the new CI job) on `main`.
3. **GitHub Project:** create Kanban board, confirm columns.
4. **Labels & milestone:** create labels + `MVP (Phase 1)` milestone.
5. **Backlog:** turn PRD scope into prioritized issues.
6. **Start building:** pull the first card (likely auth — entry point of the user flow).
