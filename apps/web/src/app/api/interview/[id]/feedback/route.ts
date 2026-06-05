import { Prisma, prisma, InterviewSessionStatus } from "@mockmate/db"
import { auth } from "@/auth"
import { generateFeedback } from "@/lib/generate-feedback"
import type { EvaluationNote } from "@/types/interview"

export const maxDuration = 60

// POST /api/interview/[id]/feedback
// Generate + persist the grading matrix for a COMPLETED session.
// Idempotent: if a Feedback row already exists, the cached row is returned immediately.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const interview = await prisma.interviewSession.findFirst({
    where: { id, userId: session.user.id },
    select: { status: true },
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

  const questions = await prisma.question.findMany({
    where: { interviewSessionId: id },
    orderBy: { questionNumber: "asc" },
    select: { evaluationNote: true },
  })

  const notes: EvaluationNote[] = questions
    .filter((q) => q.evaluationNote !== null)
    .map((q) => JSON.parse(q.evaluationNote as string) as EvaluationNote)

  if (notes.length === 0) {
    return Response.json({ error: "No evaluation notes found" }, { status: 422 })
  }

  let result: Awaited<ReturnType<typeof generateFeedback>>
  try {
    result = await generateFeedback(notes)
  } catch {
    return Response.json({ error: "Failed to generate feedback" }, { status: 500 })
  }

  try {
    const feedback = await prisma.feedback.create({
      data: { interviewSessionId: id, ...result },
    })
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
  }
}
