import { prisma, InterviewSessionStatus } from "@mockmate/db"

// GET /api/cron/abandon-sessions
// Invoked daily at midnight UTC by Vercel Cron. Finds all IN_PROGRESS sessions
// with lastActiveAt older than 24h and marks them ABANDONED.
//
// Paid sessions (#16 §3a): a paid session the system pulled the plug on must not
// cost the user money, so each one is refunded 1 credit in the SAME transaction
// as its status flip. Because the flip only targets rows still IN_PROGRESS, that
// flip is the idempotency guard — a session can't be refunded twice. Free
// sessions carry no credit, so they're flipped in one bulk update.
//
// Protected by CRON_SECRET — Vercel sets the Authorization header automatically.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Paid sessions: refund 1 credit each, atomically with the status flip.
  const paidStale = await prisma.interviewSession.findMany({
    where: {
      status: InterviewSessionStatus.IN_PROGRESS,
      lastActiveAt: { lt: threshold },
      isPaid: true,
    },
    select: { id: true, userId: true },
  })

  let refunded = 0
  for (const s of paidStale) {
    const applied = await prisma.$transaction(async (tx) => {
      const flip = await tx.interviewSession.updateMany({
        where: { id: s.id, status: InterviewSessionStatus.IN_PROGRESS },
        data: { status: InterviewSessionStatus.ABANDONED },
      })
      if (flip.count !== 1) return false
      await tx.user.update({
        where: { id: s.userId },
        data: { creditBalance: { increment: 1 } },
      })
      return true
    })
    if (applied) refunded += 1
  }

  // Free sessions: bulk flip, no refund.
  const { count: freeAbandoned } = await prisma.interviewSession.updateMany({
    where: {
      status: InterviewSessionStatus.IN_PROGRESS,
      lastActiveAt: { lt: threshold },
      isPaid: false,
    },
    data: { status: InterviewSessionStatus.ABANDONED },
  })

  return Response.json({ abandoned: freeAbandoned + refunded, refunded })
}
