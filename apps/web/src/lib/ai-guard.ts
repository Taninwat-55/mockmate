import { prisma } from "@mockmate/db"

// ============================================================
// Per-session AI spend ceiling + turn lock
// ============================================================
// `rate-limit.ts` bounds how FAST a user can spend. This file bounds how MUCH a
// single interview session can ever spend, and stops the same session from
// running several AI turns at once.
//
// Both guards live on the InterviewSession row and are applied with conditional
// `updateMany`s, so the check and the claim are one atomic statement. Anything
// that reads state, calls a model, then writes the result is exploitable by
// firing N requests in parallel: they all read the same pre-call state, all pass
// the check, and all call the model. That is the shape this file exists to
// prevent — never reintroduce it.

// Worst case for an honest session:
//   1  opening question                         (startInterview)
//   30 answer turns   — 5 questions x 3 answers x (judge + reply)
//   5  evaluation notes — one per finished main question
//   1  final grading pass
//   = 37. The cap is set above that so a few legitimate retries still fit, while
//   still putting a hard, calculable euro ceiling on any single session.
export const MAX_LLM_CALLS_PER_SESSION = 50

// How long a turn may hold the lock before another request may steal it. Above
// the routes' `maxDuration = 60` so a running turn is never cut off, but short
// enough that a crashed or client-aborted turn frees up quickly on its own.
const TURN_LOCK_MS = 90_000

/**
 * Atomically reserve `calls` model calls against this session's lifetime budget.
 * Returns false when the budget is exhausted — the caller must then make no AI
 * call at all.
 *
 * Reserved up front, never after the fact: a budget checked before the call but
 * incremented after it is no budget at all under concurrency.
 */
export async function claimLlmCalls(
  sessionId: string,
  calls: number,
): Promise<boolean> {
  try {
    const { count } = await prisma.interviewSession.updateMany({
      where: {
        id: sessionId,
        llmCallCount: { lte: MAX_LLM_CALLS_PER_SESSION - calls },
      },
      data: { llmCallCount: { increment: calls } },
    })
    return count === 1
  } catch {
    return false
  }
}

/**
 * Take the session's turn lock. Returns false when another turn already holds
 * it, which is the signal to reject with 429 rather than queue — a queued turn
 * would just be a slower way to spend the same money.
 *
 * Scoped to `userId` so the lock doubles as the ownership check: this must be
 * taken BEFORE reading the session state a turn will act on. Reading first and
 * locking second leaves a window where another turn commits in between, and the
 * winner then works from state it read before that commit.
 *
 * The lock self-expires after TURN_LOCK_MS, so a crashed or client-aborted turn
 * can never wedge a session permanently.
 */
export async function acquireTurnLock(
  sessionId: string,
  userId: string,
): Promise<boolean> {
  try {
    const now = new Date()
    const staleBefore = new Date(now.getTime() - TURN_LOCK_MS)
    const { count } = await prisma.interviewSession.updateMany({
      where: {
        id: sessionId,
        userId,
        OR: [{ turnLockedAt: null }, { turnLockedAt: { lt: staleBefore } }],
      },
      data: { turnLockedAt: now },
    })
    return count === 1
  } catch {
    return false
  }
}

/**
 * Release the turn lock. Best-effort: TURN_LOCK_MS is the real guarantee, this
 * just hands the session back sooner on the normal path. Where a route already
 * writes the session row at the end of a turn, prefer clearing `turnLockedAt` in
 * that same write so the release is atomic with the state advance.
 */
export async function releaseTurnLock(sessionId: string): Promise<void> {
  try {
    await prisma.interviewSession.updateMany({
      where: { id: sessionId },
      data: { turnLockedAt: null },
    })
  } catch {
    // Swallowed: the lock expires on its own.
  }
}
