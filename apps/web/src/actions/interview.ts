"use server"

import { redirect } from "next/navigation"
import { generateText } from "ai"
import { z } from "zod"

import {
  prisma,
  EmploymentType,
  InterviewSessionStatus,
  MessageRole,
  MessageType,
  ModelTier,
  Seniority,
  WorkSetting,
} from "@mockmate/db"
import { auth } from "@/auth"
import { chatModel, outputLimits } from "@/lib/ai"
import { buildInterviewMessages } from "@/lib/interviewer-prompt"
import { toInterviewContext } from "@/lib/interview-context"
import {
  acquireTurnLock,
  claimLlmCalls,
  releaseTurnLock,
} from "@/lib/ai-guard"
import { limitUser } from "@/lib/rate-limit"
import { posthog } from "@/lib/posthog"

// Server-side input caps (PRD §6). Resume and JD are each limited to 6,000 chars
// to control token cost; the title (the role) is a short user-facing label.
const MAX_INPUT_CHARS = 6000
const MAX_TITLE_CHARS = 120

function optionalText(label: string) {
  return z
    .string()
    .trim()
    .max(
      MAX_INPUT_CHARS,
      `${label} must be ${MAX_INPUT_CHARS.toLocaleString("en-US")} characters or fewer.`,
    )
    .optional()
    .transform((value) => value || null)
}

const newInterviewSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Tell us which role you're interviewing for.")
    .max(MAX_TITLE_CHARS, `Title must be ${MAX_TITLE_CHARS} characters or fewer.`),
  // Resume and job description are optional (#44) — first-timers often have
  // neither. Blank input is stored as null.
  resume: optionalText("Resume"),
  jobDescription: optionalText("Job description"),
  seniority: z.enum(Seniority),
  workSetting: z.enum(WorkSetting).optional(),
  employmentType: z.enum(EmploymentType).optional(),
  // The user's pick when they hold BOTH a credit and a free weekly session.
  // Ignored (and the entitlement decided automatically) when only one is
  // available. The server is authoritative — this is treated as intent, then
  // re-checked against the real balance below.
  preferCredit: z.boolean().optional(),
  // Owner-only model tier pick (#52). Ignored for everyone else — their tier
  // follows what they pay with.
  ownerTier: z.enum(ModelTier).optional(),
})

// Site-wide ceiling on free sessions per UTC day (#52). A spend guard for a
// traffic spike or free-session farming across many accounts; paid and owner
// sessions never count. A soft cap — two starts in the same instant can both take
// the last slot, which is fine at this scale.
const FREE_SESSIONS_PER_DAY = 100

export type NewInterviewInput = z.input<typeof newInterviewSchema>

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

  // Backstop above the credit/free entitlement below. Entitlement caps what a user
  // is owed; this caps what any single account can cost us per day regardless —
  // including owner accounts, which bypass entitlement entirely.
  const limit = await limitUser("sessionCreate", session.user.id)
  if (!limit.ok) {
    return {
      success: false,
      error: "You've started a lot of interviews today. Please try again tomorrow.",
    }
  }

  // Entitlement (#16): a session is paid if it spends a credit, or free if it
  // uses the weekly allowance; the model tier follows from that (#52). When the user has both, honour
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
    // Platform owner: paid perks, never consumes a credit or the weekly free.
    // The models come from their own tier pick (below).
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

  const modelTier: ModelTier = user.isOwner
    ? (parsed.data.ownerTier ?? ModelTier.PAID)
    : usePaid
      ? ModelTier.PAID
      : ModelTier.FREE

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
          // Check the daily cap before claiming, so a capped user keeps their weekly free.
          const dayStart = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
          )
          const freeToday = await tx.interviewSession.count({
            where: { isPaid: false, createdAt: { gte: dayStart } },
          })
          if (freeToday >= FREE_SESSIONS_PER_DAY) throw new Error("FREE_DAILY_CAP")

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
          seniority: parsed.data.seniority,
          workSetting: parsed.data.workSetting,
          employmentType: parsed.data.employmentType,
          isPaid: usePaid,
          modelTier,
          // status defaults to IN_PROGRESS in the schema
        },
        select: { id: true },
      })
    })
  } catch (err) {
    if (err instanceof Error && err.message === "FREE_DAILY_CAP") {
      return {
        success: false,
        error:
          "Today's free interviews are all taken. Come back tomorrow, or start one now with a credit.",
      }
    }
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
        seniority: parsed.data.seniority,
        tier: usePaid ? "paid" : "free",
        model_tier: modelTier,
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

  const limit = await limitUser("startInterview", session.user.id)
  if (!limit.ok) {
    return { success: false, error: "You're going too fast. Please try again shortly." }
  }

  // The "already opened?" check below is idempotency, not a spend guard — parallel
  // calls all miss it and all call the model. Take the session's turn lock first so
  // only one opening question can ever be generated at a time.
  if (!(await acquireTurnLock(sessionId, session.user.id))) {
    const owned = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId: session.user.id },
      select: { id: true },
    })
    return {
      success: false,
      error: owned
        ? "This interview is already starting. Give it a moment."
        : "Interview not found.",
    }
  }

  try {
    const interview = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId: session.user.id },
      select: {
        id: true,
        status: true,
        modelTier: true,
        title: true,
        seniority: true,
        workSetting: true,
        employmentType: true,
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

    if (!(await claimLlmCalls(sessionId, 1))) {
      return { success: false, error: "This interview has reached its limit." }
    }

    const model = chatModel(interview.modelTier)
    const { text } = await generateText({
      model,
      maxRetries: 2,
      ...outputLimits(model, 1000),
      messages: buildInterviewMessages({
        context: toInterviewContext(interview),
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
  } finally {
    await releaseTurnLock(sessionId)
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
