import { Prisma, prisma, InterviewSessionStatus } from "@mockmate/db"
import { auth } from "@/auth"
import {
  generateStageResult,
  needsStageResultModel,
} from "@/lib/generate-stage-result"
import {
  acquireTurnLock,
  claimLlmCalls,
  llmBudget,
  releaseTurnLock,
} from "@/lib/ai-guard"
import { limitUser, tooManyRequests } from "@/lib/rate-limit"
import { toInterviewContext } from "@/lib/interview-context"
import { parseEvaluationNote, type EvaluationNote } from "@/types/interview"

export const maxDuration = 60

// POST /api/interview/[id]/stage-result
// The soft gate after a round of a multi-round loop (#73): generate + persist the
// verdict for the round that just ended. Idempotent: an existing StageResult for
// that round is returned as is. Same spend guards as the feedback route: per-user
// rate limit, the session's turn lock, a re-check under the lock and the call budget.
//
// 409 until the round has really ended (`roundEndedAt`): the chat can show the gate
// from the reply's metadata a moment before `roundEndedAt` is committed, so the
// client retries a 409 briefly.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const limit = await limitUser("stageResult", session.user.id)
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds)

  const interview = await prisma.interviewSession.findFirst({
    where: { id, userId: session.user.id },
    select: {
      status: true,
      roundEndedAt: true,
      modelTier: true,
      stages: true,
      title: true,
      company: true,
      seniority: true,
      workSetting: true,
      employmentType: true,
    },
  })
  if (!interview) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }
  if (interview.status !== InterviewSessionStatus.IN_PROGRESS || !interview.roundEndedAt) {
    return Response.json({ error: "This round hasn't ended yet." }, { status: 409 })
  }

  // The round that just ended is the round of the latest question.
  const last = await prisma.question.findFirst({
    where: { interviewSessionId: id },
    orderBy: { questionNumber: "desc" },
    select: { stage: true },
  })
  if (!last) {
    return Response.json({ error: "No questions yet." }, { status: 409 })
  }
  const stage = last.stage
  const key = { interviewSessionId_stage: { interviewSessionId: id, stage } }

  const existing = await prisma.stageResult.findUnique({ where: key })
  if (existing) return Response.json({ stageResult: existing, cached: true })

  if (!(await acquireTurnLock(id, session.user.id))) {
    return Response.json(
      { error: "Your round result is already being generated." },
      { status: 429, headers: { "Retry-After": "5" } },
    )
  }

  try {
    // Re-check under the lock: a request ahead of us may have just written it.
    const justCreated = await prisma.stageResult.findUnique({ where: key })
    if (justCreated) return Response.json({ stageResult: justCreated, cached: true })

    const questions = await prisma.question.findMany({
      where: { interviewSessionId: id, stage },
      orderBy: { questionNumber: "asc" },
      select: { evaluationNote: true },
    })
    const notes: EvaluationNote[] = questions
      .filter((q) => q.evaluationNote !== null)
      .map((q) => parseEvaluationNote(q.evaluationNote as string))

    if (needsStageResultModel(notes) && !(await claimLlmCalls(id, 1, llmBudget(interview.stages)))) {
      return Response.json({ error: "This interview has reached its limit." }, { status: 429 })
    }

    let result: Awaited<ReturnType<typeof generateStageResult>>
    try {
      result = await generateStageResult(notes, toInterviewContext(interview), interview.modelTier, stage)
    } catch {
      return Response.json({ error: "Failed to generate the round result." }, { status: 500 })
    }

    try {
      const stageResult = await prisma.stageResult.create({
        data: { interviewSessionId: id, stage, ...result },
      })
      return Response.json({ stageResult, cached: false })
    } catch (err) {
      // P2002: unique constraint — a concurrent request already created the row.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const row = await prisma.stageResult.findUnique({ where: key })
        return Response.json({ stageResult: row, cached: true })
      }
      throw err
    }
  } finally {
    await releaseTurnLock(id)
  }
}
