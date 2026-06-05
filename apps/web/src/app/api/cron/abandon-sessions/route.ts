import { prisma, InterviewSessionStatus } from "@mockmate/db"

// GET /api/cron/abandon-sessions
// Invoked daily at midnight UTC by Vercel Cron. Finds all IN_PROGRESS sessions
// with lastActiveAt older than 24h and marks them ABANDONED.
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
  const { count } = await prisma.interviewSession.updateMany({
    where: {
      status: InterviewSessionStatus.IN_PROGRESS,
      lastActiveAt: { lt: threshold },
    },
    data: { status: InterviewSessionStatus.ABANDONED },
  })

  return Response.json({ abandoned: count })
}
