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

---

## 4. Versioning

**Semantic Versioning** — `vMAJOR.MINOR.PATCH`:
- **MAJOR** — breaking changes (stays at 0 during MVP)
- **MINOR** — new features (`feat:` commits)
- **PATCH** — fixes (`fix:` commits)

- Start at **`v0.1.0`** (pre-1.0 = MVP, API/UX can still change freely).
- Tag each release on `main`: `git tag v0.1.0 && git push origin v0.1.0`.
- Conventional Commits map cleanly to version bumps.

---

## 5. Deployment Environments

Mapped to branches once the repo is connected to Vercel:
- `main` → production domain
- `develop` → staging domain (Vercel preview with an assigned domain)
- Every PR → its own ephemeral preview URL

---

## 6. Project Management — Kanban

Solo development uses **Kanban** (flow-based), not Scrum (sprints, standups, retros exist to coordinate a team, not a solo developer). We borrow Scrum's useful artifacts — a prioritized backlog and a clear definition of done — without the meetings.

**Board:** GitHub Projects (Kanban board linked in the repo).

### Columns

| Column | Meaning |
|---|---|
| **Backlog** | Idea captured, not yet groomed. May lack scope or acceptance criteria. |
| **Ready** | Groomed and pickable. Has a clear title, acceptance criteria, labels, and milestone. |
| **In Progress** | Actively being built. **WIP limit: 2 max.** One is ideal. |
| **In Review** | PR is open and passing CI. Waiting for review/merge. |
| **Done** | Merged to `develop`. Card closed. |

**The Backlog → Ready distinction matters.** Moving a card to Ready is a deliberate act — it means the issue is properly scoped and ready to be started without ambiguity. Don't pick up a Backlog card directly.

**WIP limit:** Never have more than 2 cards In Progress at once. Context-switching kills momentum. Finish before starting.

### Definition of Done

An issue is Done when:
- `pnpm build` passes with no errors
- Feature works end-to-end in the browser
- PR merged to `develop`
- Card moved to Done on the board
- Entry logged in `docs/active-feature.md`

---

## 7. Issue Conventions

**Rule: nothing gets built without an issue.** Every branch, PR, and commit traces back to an issue number.

### Mandatory fields on every issue

- **Title** — outcome-oriented, not task-oriented
  - ✅ "User can sign in with Google"
  - ❌ "implement NextAuth"
- **Labels** — one from each group: type + priority + area (all three, always)
- **Milestone** — attach to the relevant phase (`MVP (Phase 1)`, `Phase 2`, etc.)
- **Acceptance criteria** — checkboxes that define what "done" looks like

### Issue template

```
**Why**
One sentence on why this matters or what it unblocks.

**Acceptance criteria**
- [ ] Specific, testable condition
- [ ] Specific, testable condition
- [ ] pnpm build passes, feature works in browser

**Notes** (optional)
Links to spec docs, constraints, known gotchas.
```

Acceptance criteria is the most important habit. It answers "how do I know when I'm done?" without ambiguity.

---

## 8. PR Conventions

Every PR has a title in Conventional Commits format and a body from the PR template
(`.github/pull_request_template.md`). The body must always include `Closes #<issue>` —
this auto-closes the issue and moves the card to Done on merge.

**PR template:**
```
## What
Brief description of the change.

## Closes
Closes #[issue number]

## How to test
Steps to verify the feature works in the browser.

## Checklist
- [ ] pnpm build passes
- [ ] Works in the browser
- [ ] No console errors
```

---

## 9. Label Reference

Three dimensions. Every issue gets one label from each.

### Type — what kind of work

| Label | When to use |
|---|---|
| `feat` | New feature or functionality |
| `bug` | Something broken |
| `chore` | Infra, config, tooling — no user-facing change |
| `docs` | Documentation only |
| `refactor` | Code change with no behavior change |

### Priority — how urgent

| Label | Meaning |
|---|---|
| `P0: critical` | Blocks launch or breaks production — drop everything |
| `P1: high` | Current focus, should be in this working period |
| `P2: medium` | Important but not urgent, next up |
| `P3: low` | Nice to have, backlog |

### Area — what part of the system

| Label | What it covers |
|---|---|
| `frontend` | UI, components, pages |
| `backend` | API routes, server actions, DB logic |
| `ai` | LLM calls, prompts, grading |
| `auth` | Login, session, NextAuth |
| `billing` | Stripe, credits, profile page |
| `infra` | CI, Vercel, Terraform, cron |
