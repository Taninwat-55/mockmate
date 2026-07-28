import { prisma } from "@mockmate/db"

// ============================================================
// Fixed-window rate limiter (abuse / cost control)
// ============================================================
// Every AI call in MockMate costs real money, so no authenticated user may call
// one at an unbounded rate. This is the per-user throttle; `ai-guard.ts` is the
// per-session ceiling. They are independent on purpose — the throttle bounds how
// fast money can be spent, the ceiling bounds how much a single session can ever
// spend.
//
// Storage is a plain Postgres table (`RateLimit`), not Redis: the app already
// talks to Postgres on every request for the auth session, so this adds no new
// service, no new env var, and no new bill.
//
// Correctness note: the counter is bumped in ONE statement
// (`INSERT ... ON CONFLICT DO UPDATE`), which Postgres applies atomically per
// row. A read-then-write version would let N concurrent requests all read the
// same count and all pass — exactly the hole this exists to close.

export type RateLimitResult = {
  ok: boolean
  /** Seconds until the current window rolls over. 0 when `ok`. */
  retryAfterSeconds: number
}

// Buckets are sized for real human use with generous headroom; anything above
// these is automation, not a candidate practising interviews.
export const LIMITS = {
  /** One answer per turn; a fast typist sends a handful per minute at most. */
  interviewTurn: { limit: 20, windowSeconds: 60 },
  /** Starting brand-new sessions — the most expensive action per unit. */
  sessionCreate: { limit: 10, windowSeconds: 86_400 },
  /** Seeding the opening question of a session. */
  startInterview: { limit: 20, windowSeconds: 3_600 },
  /** Grading passes (Pro model — the priciest single call in the app). */
  feedback: { limit: 20, windowSeconds: 3_600 },
  /** Stripe Checkout session creation. Costs nothing in AI, but not free to spam. */
  checkout: { limit: 10, windowSeconds: 3_600 },
} as const

export type LimitBucket = keyof typeof LIMITS

/**
 * Count one hit against `key` and report whether it stays within `limit` per
 * `windowSeconds`.
 *
 * Fails CLOSED: if the counter can't be written we deny rather than allow. A
 * request can never reach here without a database-backed auth session anyway, so
 * a dead database means the app is already down — it must not mean the spend
 * guard is silently off.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const windowMs = windowSeconds * 1000
  const cutoff = new Date(Date.now() - windowMs)

  try {
    // The two CASE arms are the window roll-over: if the stored window opened
    // before `cutoff` it has expired, so the count restarts at 1 and the window
    // reopens now; otherwise the existing window keeps counting up.
    const rows = await prisma.$queryRaw<{ count: number; windowStart: Date }[]>`
      INSERT INTO "RateLimit" ("key", "windowStart", "count", "updatedAt")
      VALUES (${key}, now(), 1, now())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimit"."windowStart" < ${cutoff} THEN 1
          ELSE "RateLimit"."count" + 1
        END,
        "windowStart" = CASE
          WHEN "RateLimit"."windowStart" < ${cutoff} THEN now()
          ELSE "RateLimit"."windowStart"
        END,
        "updatedAt" = now()
      RETURNING "count", "windowStart"
    `

    const row = rows[0]
    if (!row) return { ok: false, retryAfterSeconds: windowSeconds }
    if (row.count <= limit) return { ok: true, retryAfterSeconds: 0 }

    const resetAt = row.windowStart.getTime() + windowMs
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
    }
  } catch {
    return { ok: false, retryAfterSeconds: windowSeconds }
  }
}

/** `rateLimit` for a named bucket, scoped to one user. */
export function limitUser(bucket: LimitBucket, userId: string) {
  const { limit, windowSeconds } = LIMITS[bucket]
  return rateLimit(`${bucket}:${userId}`, limit, windowSeconds)
}

/** Standard 429 for API routes, with the Retry-After header clients expect. */
export function tooManyRequests(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "You're going too fast. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  )
}
