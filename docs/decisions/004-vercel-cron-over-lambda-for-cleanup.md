# ADR-004: Vercel Cron over AWS Lambda for Abandoned Session Cleanup

**Date:** 2026-06-02  
**Status:** Accepted

---

## Context

Sessions that are never completed — because the user closed the tab, lost connection, or simply never returned — remain in the database with a status of `IN_PROGRESS` indefinitely. A scheduled background job is needed to find these sessions and mark them `ABANDONED` after 24 hours of inactivity.

The project already includes AWS Lambda in the stack for a different use case: sending a post-session summary email after a session completes. The question is whether Lambda should also handle this cleanup task.

---

## Options Considered

- **AWS Lambda + EventBridge (scheduled trigger)** — Lambda is already in the stack. EventBridge can trigger a function on a cron schedule. But this adds: a new Lambda function, an EventBridge rule, IAM permissions for Lambda to reach the database, and corresponding Terraform configuration for all of it. Significant infrastructure overhead for a job that is a single database query.
- **Vercel Cron Jobs** — built into Vercel, configured via `vercel.json`. Points at a Next.js API route on a schedule. Zero additional infrastructure, zero IAM configuration, zero Terraform additions. The API route calls Prisma and updates the rows.
- **Separate Node.js cron process** — run a persistent cron server using `node-cron`. Requires persistent compute, which means a separate server or container. Overkill and adds ongoing cost.
- **Database-level scheduled job (pg_cron)** — PostgreSQL supports scheduled queries via the `pg_cron` extension. Neon does not expose this by default, and placing cleanup logic inside the database rather than application code creates an invisible side effect that is harder to observe, test, and version.

---

## Decision

Use **Vercel Cron** for the abandoned session cleanup job. The job runs once daily, queries for `IN_PROGRESS` sessions with a `last_active_at` timestamp older than 24 hours, and updates their status to `ABANDONED`.

**AWS Lambda is reserved for the post-session summary email** — an async task that involves an LLM call, runs after session completion, and must not block the feedback page from loading. That is the right use case for Lambda: isolated, potentially long-running compute decoupled from the request cycle.

---

## Consequences

**Positive**
- Zero additional infrastructure for the cleanup job — no new Terraform, no new IAM policies, no new AWS resources
- Consistent with where the rest of the application logic lives (Next.js API routes)
- Observable and testable: the cron route can be called manually during development to verify behaviour
- Lambda is used for a task that genuinely suits it, keeping the AWS infrastructure purposeful rather than sprawling

**Negative / trade-offs**
- Vercel Cron is tied to Vercel's hosting — if the project ever moves to a different platform, the scheduler needs to be replaced
- Vercel Cron has a minimum interval of once per day on the free tier; if a shorter cleanup window is ever needed (e.g., 1 hour), a paid plan or a different scheduler would be required
- Two different scheduling mechanisms in the stack (Vercel Cron and Lambda) means two mental models to maintain; the distinction must be documented clearly so future contributors don't add the wrong kind of job to the wrong system
