"use server"

import { redirect } from "next/navigation"
import { generateText } from "ai"
import { z } from "zod"

import {
  prisma,
  InterviewSessionStatus,
  MessageRole,
  MessageType,
} from "@mockmate/db"
import { auth } from "@/auth"
import { chatModel } from "@/lib/ai"
import { buildInterviewMessages } from "@/lib/interviewer-prompt"
import { posthog } from "@/lib/posthog"

// Server-side input caps (PRD §6). Resume and JD are each limited to 6,000 chars
// to control token cost; the title is a short user-facing label.
const MAX_INPUT_CHARS = 6000
const MAX_TITLE_CHARS = 120

const newInterviewSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Add a role or company so you can find this session later.")
    .max(MAX_TITLE_CHARS, `Title must be ${MAX_TITLE_CHARS} characters or fewer.`),
  resume: z
    .string()
    .trim()
    .min(1, "Paste your resume to give the interviewer context.")
    .max(
      MAX_INPUT_CHARS,
      `Resume must be ${MAX_INPUT_CHARS.toLocaleString("en-US")} characters or fewer.`,
    ),
  jobDescription: z
    .string()
    .trim()
    .min(1, "Paste the job description you're targeting.")
    .max(
      MAX_INPUT_CHARS,
      `Job description must be ${MAX_INPUT_CHARS.toLocaleString("en-US")} characters or fewer.`,
    ),
  // The user's pick when they hold BOTH a credit and a free weekly session.
  // Ignored (and the entitlement decided automatically) when only one is
  // available. The server is authoritative — this is treated as intent, then
  // re-checked against the real balance below.
  preferCredit: z.boolean().optional(),
})

export type NewInterviewInput = z.infer<typeof newInterviewSchema>

type ActionResult = { success: false; error: string }

export async function createInterviewSession(
  input: NewInterviewInput,
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "You need to be signed in to start an interview." }
  }

  const parsed = newInterviewSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  // Entitlement (#16): a session is paid (Pro models) if it spends a credit, or
  // free (Flash) if it uses the weekly allowance. When the user has both, honour
  // their pick; with only one available, decide automatically; with neither,
  // block and point them to /buy.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { creditBalance: true, freeSessionRefreshAt: true, isOwner: true },
  })
  if (!user) {
    return { success: false, error: "You need to be signed in to start an interview." }
  }

  const now = new Date()
  const creditAvailable = user.creditBalance > 0
  const freeAvailable = now >= user.freeSessionRefreshAt

  let usePaid: boolean
  if (user.isOwner) {
    // Platform owner: always Pro, never consumes a credit or the weekly free.
    usePaid = true
  } else if (creditAvailable && freeAvailable) {
    usePaid = parsed.data.preferCredit ?? false
  } else if (creditAvailable) {
    usePaid = true
  } else if (freeAvailable) {
    usePaid = false
  } else {
    const days = Math.max(
      1,
      Math.ceil((user.freeSessionRefreshAt.getTime() - now.getTime()) / 86_400_000),
    )
    return {
      success: false,
      error: `You're out of credits, and your free session resets in ${days} day${
        days === 1 ? "" : "s"
      }. Buy credits to start one now.`,
    }
  }

  // Spend the entitlement and create the session atomically. The conditional
  // updates (gt:0 / lte:now) are the race guard: two concurrent starts can't both
  // win the same credit or the same weekly free.
  let interview
  try {
    interview = await prisma.$transaction(async (tx) => {
      // Owners consume no entitlement — skip straight to creating the session.
      if (!user.isOwner) {
        if (usePaid) {
          const spent = await tx.user.updateMany({
            where: { id: session.user.id, creditBalance: { gt: 0 } },
            data: { creditBalance: { decrement: 1 } },
          })
          if (spent.count !== 1) throw new Error("ENTITLEMENT_RACE")
        } else {
          const next = new Date(now.getTime() + 7 * 86_400_000)
          const claimed = await tx.user.updateMany({
            where: { id: session.user.id, freeSessionRefreshAt: { lte: now } },
            data: { freeSessionRefreshAt: next },
          })
          if (claimed.count !== 1) throw new Error("ENTITLEMENT_RACE")
        }
      }

      return tx.interviewSession.create({
        data: {
          userId: session.user.id,
          title: parsed.data.title,
          resume: parsed.data.resume,
          jobDescription: parsed.data.jobDescription,
          isPaid: usePaid,
          // status defaults to IN_PROGRESS in the schema
        },
        select: { id: true },
      })
    })
  } catch {
    return {
      success: false,
      error: "Couldn't start the interview. Please try again.",
    }
  }

  try {
    posthog.capture({
      distinctId: session.user.id,
      event: "session_started",
      properties: {
        session_id: interview.id,
        user_id: session.user.id,
        role_title: parsed.data.title,
        tier: usePaid ? "paid" : "free",
      },
    })
  } catch {}

  // redirect throws internally, so it must run outside the try/catch above.
  redirect(`/interview/${interview.id}`)
}

// The opening question. Seeded non-streaming (a simple mutation, so a Server Action)
// the first time the interview screen mounts — only answer-turn replies stream, which
// keeps the "assistant speaks first" case out of `useChat`. Idempotent: if the session
// already has its first question, the existing one is returned so a refresh or double
// mount can't create a second.
type StartInterviewResult =
  | { success: true; question: { id: string; text: string } }
  | { success: false; error: string }

export async function startInterview(
  sessionId: string,
): Promise<StartInterviewResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "You need to be signed in." }
  }

  const interview = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
    select: {
      id: true,
      status: true,
      isPaid: true,
      resume: true,
      jobDescription: true,
      questions: {
        orderBy: { questionNumber: "asc" },
        take: 1,
        select: { messages: { take: 1, select: { id: true, content: true } } },
      },
    },
  })
  if (!interview) {
    return { success: false, error: "Interview not found." }
  }
  if (interview.status !== InterviewSessionStatus.IN_PROGRESS) {
    return { success: false, error: "This interview has already ended." }
  }

  // Already opened — return the existing first question.
  const existing = interview.questions[0]?.messages[0]
  if (existing) {
    return { success: true, question: { id: existing.id, text: existing.content } }
  }

  try {
    const { text } = await generateText({
      model: chatModel(interview.isPaid),
      maxRetries: 2,
      messages: buildInterviewMessages({
        resume: interview.resume,
        jobDescription: interview.jobDescription,
        candidateName: session.user.name,
      }),
    })

    const message = await prisma.$transaction(async (tx) => {
      const question = await tx.question.create({
        data: {
          interviewSessionId: interview.id,
          questionNumber: 1,
          questionText: text,
        },
      })
      const created = await tx.message.create({
        data: {
          questionId: question.id,
          role: MessageRole.AI,
          type: MessageType.MAIN_QUESTION,
          content: text,
        },
        select: { id: true, content: true },
      })
      await tx.interviewSession.update({
        where: { id: interview.id },
        data: { mainQuestionCount: 1, lastActiveAt: new Date() },
      })
      return created
    })

    return { success: true, question: { id: message.id, text: message.content } }
  } catch {
    return {
      success: false,
      error: "Couldn't start the interview. Please try again.",
    }
  }
}

// "End Interview Early" (PRD §6 trigger 2). Flips the session to COMPLETED from
// whatever was logged; grading off the evaluation notes is a separate feature (#5).
// Idempotent: ending an already-ended session is a no-op success.
export async function endInterviewEarly(
  sessionId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "You need to be signed in." }
  }

  let questionCount: number | undefined
  try {
    const existing = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId: session.user.id, status: InterviewSessionStatus.IN_PROGRESS },
      select: { mainQuestionCount: true },
    })
    questionCount = existing?.mainQuestionCount
    await prisma.interviewSession.updateMany({
      where: {
        id: sessionId,
        userId: session.user.id,
        status: InterviewSessionStatus.IN_PROGRESS,
      },
      data: { status: InterviewSessionStatus.COMPLETED, lastActiveAt: new Date() },
    })
  } catch {
    return { success: false, error: "Couldn't end the interview. Please try again." }
  }

  if (questionCount !== undefined) {
    try {
      posthog.capture({
        distinctId: session.user.id,
        event: "session_completed",
        properties: {
          session_id: sessionId,
          user_id: session.user.id,
          question_count: questionCount,
        },
      })
    } catch {}
  }

  return { success: true }
}
