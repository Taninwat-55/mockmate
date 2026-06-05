import { prisma, SubscriptionStatus } from "@mockmate/db"

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const FREE_WEEKLY_LIMIT = 1

export type WeeklyUsage = {
  isPro: boolean
  /** Sessions started in the last 7 days. */
  used: number
  /** Weekly allowance for the plan (FREE only). */
  limit: number
  /**
   * Whole days until the user's allowance frees up again, or null when there's
   * nothing to reset (no sessions in the window, or unlimited Pro plan).
   */
  resetsInDays: number | null
}

/**
 * Display-only weekly usage for the billing section. No enforcement happens
 * here — the FREE "1 session / week" limit is shown, not gated (that lands with
 * Stripe in issue #16).
 */
export async function getWeeklyUsage(
  userId: string,
  subscriptionStatus: SubscriptionStatus
): Promise<WeeklyUsage> {
  if (subscriptionStatus === SubscriptionStatus.PRO) {
    return { isPro: true, used: 0, limit: Infinity, resetsInDays: null }
  }

  const windowStart = new Date(Date.now() - WEEK_MS)

  const [used, oldestInWindow] = await Promise.all([
    prisma.interviewSession.count({
      where: { userId, createdAt: { gte: windowStart } },
    }),
    prisma.interviewSession.findFirst({
      where: { userId, createdAt: { gte: windowStart } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ])

  // The allowance frees up when the oldest session in the window ages out of it.
  let resetsInDays: number | null = null
  if (oldestInWindow) {
    const resetAt = oldestInWindow.createdAt.getTime() + WEEK_MS
    resetsInDays = Math.max(0, Math.ceil((resetAt - Date.now()) / (24 * 60 * 60 * 1000)))
  }

  return { isPro: false, used, limit: FREE_WEEKLY_LIMIT, resetsInDays }
}
