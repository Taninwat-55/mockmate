import { Prisma, prisma, InterviewSessionStatus } from "@mockmate/db"
import { auth } from "@/auth"
import { generateFeedback } from "@/lib/generate-feedback"
import { invokeEmailLambda } from "@/lib/invoke-email-lambda"
import {
  acquireTurnLock,
  claimLlmCalls,
  releaseTurnLock,
} from "@/lib/ai-guard"
import { limitUser, tooManyRequests } from "@/lib/rate-limit"
import type { EvaluationNote } from "@/types/interview"

export const maxDuration = 60

// POST /api/interview/[id]/feedback
// Generate + persist the grading matrix for a COMPLETED session.
// Idempotent: if a Feedback row already exists, the cached row is returned immediately.
//
// The cached-row check is idempotency, NOT a spend guard: N parallel requests all miss
// it and all run `generateFeedback` — on the Pro model, the priciest call in the app —
// before any of them writes the row. So the same turn lock the chat route uses is taken
// here too (the session is COMPLETED by now, so no chat turn can be contending for it),
// backed by the per-session call budget and a per-user rate limit.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const limit = await limitUser("feedback", session.user.id)
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds)

  const interview = await prisma.interviewSession.findFirst({
    where: { id, userId: session.user.id },
    select: { status: true, isPaid: true },
  })

  if (!interview) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }
  if (interview.status !== InterviewSessionStatus.COMPLETED) {
    return Response.json({ error: "Session is not completed" }, { status: 422 })
  }

  const existing = await prisma.feedback.findUnique({
    where: { interviewSessionId: id },
  })
  if (existing) {
    return Response.json({ feedback: existing, cached: true })
  }

  // Serialise grading for this session. From here every exit path must release.
  if (!(await acquireTurnLock(id, session.user.id))) {
    return Response.json(
      { error: "Your feedback is already being generated." },
      { status: 429, headers: { "Retry-After": "5" } },
    )
  }

  // Re-check under the lock: a request that was ahead of us may have just written
  // the row, and regenerating it would be a model call spent for nothing.
  const justCreated = await prisma.feedback.findUnique({
    where: { interviewSessionId: id },
  })
  if (justCreated) {
    await releaseTurnLock(id)
    return Response.json({ feedback: justCreated, cached: true })
  }

  const questions = await prisma.question.findMany({
    where: { interviewSessionId: id },
    orderBy: { questionNumber: "asc" },
    select: { evaluationNote: true },
  })

  const notes: EvaluationNote[] = questions
    .filter((q) => q.evaluationNote !== null)
    .map((q) => JSON.parse(q.evaluationNote as string) as EvaluationNote)

  if (notes.length === 0) {
    await releaseTurnLock(id)
    return Response.json({ error: "No evaluation notes found" }, { status: 422 })
  }

  if (!(await claimLlmCalls(id, 1))) {
    await releaseTurnLock(id)
    return Response.json(
      { error: "This interview has reached its limit." },
      { status: 429 },
    )
  }

  let result: Awaited<ReturnType<typeof generateFeedback>>
  try {
    result = await generateFeedback(notes, interview.isPaid)
  } catch {
    await releaseTurnLock(id)
    return Response.json({ error: "Failed to generate feedback" }, { status: 500 })
  }

  try {
    const feedback = await prisma.feedback.create({
      data: { interviewSessionId: id, ...result },
    })
    // Email summary is a paid-session perk (#16) — free sessions get the web
    // report only.
    if (interview.isPaid) void invokeEmailLambda(id)
    return Response.json({ feedback, cached: false })
  } catch (err) {
    // P2002: unique constraint — a concurrent request already created the row.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.feedback.findUnique({
        where: { interviewSessionId: id },
      })
      return Response.json({ feedback: existing, cached: true })
    }
    throw err
  } finally {
    await releaseTurnLock(id)
  }
}
