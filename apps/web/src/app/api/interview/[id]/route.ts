import { streamText } from "ai"
import { z } from "zod"

import {
  prisma,
  InterviewSessionStatus,
  MessageRole,
  MessageType,
} from "@mockmate/db"
import { auth } from "@/auth"
import { chatModel } from "@/lib/ai"
import {
  INTERVIEWER_SYSTEM_PROMPT,
  buildContextMessage,
} from "@/lib/interviewer-prompt"
import {
  assessAnswer,
  determineNextAction,
  resolveQuestionStatus,
  MAX_ANSWER_CHARS,
} from "@/lib/interview-engine"
import { generateEvaluationNote } from "@/lib/evaluate-answer"
import { judgeAnswerWeak } from "@/lib/judge-answer"
import {
  acquireTurnLock,
  claimLlmCalls,
  releaseTurnLock,
} from "@/lib/ai-guard"
import { limitUser, tooManyRequests } from "@/lib/rate-limit"
import { posthog } from "@/lib/posthog"
import type { InterviewTurn } from "@/types/interview"
import type { InterviewUIMessage } from "@/types/interview-chat"

// The streaming interview endpoint — one POST per candidate answer. The server is
// authoritative: it rebuilds the §6 state from the DB each request, decides the next
// action deterministically (`determineNextAction`), then directs the model to produce
// exactly that. This keeps the persisted rows/counts in lockstep with what the model
// says. Weakness is therefore judged BEFORE the visible reply streams.
//
// Order of operations (PRD §6/§7): cap the answer, save it before any LLM call so it
// is never lost, judge it, branch, then stream. All state mutations that depend on the
// reply (new question, counts, status, evaluation note, AI message) happen in
// `onFinish` — the success path — so a failed-and-retried attempt mutates nothing past
// the already-saved answer.
//
// Spend control (this endpoint is the app's main cost surface — up to 3 model calls
// per request). Because state only advances in `onFinish`, everything before it is a
// read-then-call window that parallel requests would otherwise all pass at once. Four
// layers close that:
//   1. per-user rate limit  — bounds how fast turns can be requested at all
//   2. per-session turn lock — one turn in flight per session, so N parallel POSTs
//      become 1 model call, not N
//   3. per-session call budget, reserved BEFORE each model call — a hard lifetime
//      ceiling that holds even if a future bug reopens a loop here
//   4. `consumeStream()` — guarantees `onFinish` runs (and therefore that state
//      advances and the lock clears) even when the client aborts mid-stream. Without
//      it, "POST then abort" replays the retry branch below forever.
// Removing any one of these makes an unbounded model-spend loop reachable by any
// signed-in user.

export const maxDuration = 60

const bodySchema = z.object({ message: z.string().min(1) })

function toTurn(m: { role: MessageRole; content: string }): InterviewTurn {
  return {
    role: m.role === MessageRole.AI ? "assistant" : "user",
    content: m.content,
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "You need to be signed in." }, { status: 401 })
  }
  const { id } = await params

  const limit = await limitUser("interviewTurn", session.user.id)
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds)

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return Response.json({ error: "An answer is required." }, { status: 400 })
  }
  const incoming = parsed.data.message
  if (incoming.length > MAX_ANSWER_CHARS) {
    return Response.json(
      {
        error: `Answers are capped at ${MAX_ANSWER_CHARS.toLocaleString("en-US")} characters.`,
      },
      { status: 400 },
    )
  }

  // Lock BEFORE reading the state this turn will act on. The lock is scoped to the
  // owner, so taking it is also the ownership check; a failure means either "not
  // yours / no such session" or "a turn is already running", disambiguated below.
  if (!(await acquireTurnLock(id, session.user.id))) {
    const owned = await prisma.interviewSession.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    })
    if (!owned) {
      return Response.json({ error: "Interview not found." }, { status: 404 })
    }
    return Response.json(
      { error: "This interview is already processing an answer." },
      { status: 429, headers: { "Retry-After": "5" } },
    )
  }

  const interview = await prisma.interviewSession.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      status: true,
      isPaid: true,
      resume: true,
      jobDescription: true,
      mainQuestionCount: true,
      questions: {
        orderBy: { questionNumber: "asc" },
        select: {
          id: true,
          questionNumber: true,
          questionText: true,
          followupCount: true,
          messages: {
            orderBy: { createdAt: "asc" },
            select: { role: true, type: true, content: true },
          },
        },
      },
    },
  })
  // From here on the turn lock is held, so every exit path must release it.
  if (!interview) {
    await releaseTurnLock(id)
    return Response.json({ error: "Interview not found." }, { status: 404 })
  }
  if (interview.status !== InterviewSessionStatus.IN_PROGRESS) {
    await releaseTurnLock(id)
    return Response.json(
      { error: "This interview has already ended." },
      { status: 409 },
    )
  }
  const current = interview.questions.at(-1)
  if (!current) {
    await releaseTurnLock(id)
    return Response.json(
      { error: "The interview hasn't started yet." },
      { status: 409 },
    )
  }

  // Which AI question is being answered tells us the answer's type. If the last row is
  // already a candidate answer, the previous turn's reply failed to persist and the
  // client is retrying — the answer is saved, so skip re-saving and re-stream.
  const lastMsg = current.messages.at(-1)
  const lastType = lastMsg?.type
  const answerAlreadyPersisted =
    lastType === MessageType.USER_ANSWER ||
    lastType === MessageType.FOLLOWUP_ANSWER

  let answerType: MessageType
  if (lastType === MessageType.MAIN_QUESTION || lastType === MessageType.USER_ANSWER) {
    answerType = MessageType.USER_ANSWER
  } else if (
    lastType === MessageType.FOLLOWUP_QUESTION ||
    lastType === MessageType.FOLLOWUP_ANSWER
  ) {
    answerType = MessageType.FOLLOWUP_ANSWER
  } else {
    await releaseTurnLock(id)
    return Response.json(
      { error: "There is no open question to answer." },
      { status: 409 },
    )
  }
  const answerText = answerAlreadyPersisted && lastMsg ? lastMsg.content : incoming

  const historyTurns: InterviewTurn[] = interview.questions.flatMap((q) =>
    q.messages.map(toTurn),
  )
  const currentTurns: InterviewTurn[] = current.messages.map(toTurn)

  if (!answerAlreadyPersisted) {
    const answerTurn: InterviewTurn = { role: "user", content: answerText }
    historyTurns.push(answerTurn)
    currentTurns.push(answerTurn)

    // Save the answer BEFORE the LLM call (architecture rule — never lose input).
    await prisma.$transaction([
      prisma.message.create({
        data: {
          questionId: current.id,
          role: MessageRole.USER,
          type: answerType,
          content: answerText,
        },
      }),
      prisma.interviewSession.update({
        where: { id },
        data: { lastActiveAt: new Date() },
      }),
    ])
  }

  // Combine the deterministic length check with the model's semantic verdict, then
  // pick the next move from the §6 state machine. If the judge call exhausts its SDK
  // retries (429/5xx), return a structured error so the client can surface a retry
  // affordance — the answer is already in DB, so no input is lost.
  let isWeak: boolean
  let action: ReturnType<typeof determineNextAction>
  let directive: string
  let sessionStatus: "IN_PROGRESS" | "COMPLETED"

  // Reserve this turn's two model calls (judge + reply) against the session's
  // lifetime budget before either runs. A session that has burned through its
  // budget is finished, not throttled — the answer is already saved.
  if (!(await claimLlmCalls(id, 2))) {
    await releaseTurnLock(id)
    return Response.json(
      {
        error:
          "This interview has reached its limit. Your answer is saved — please start a new session.",
      },
      { status: 429 },
    )
  }

  try {
    const llmJudgedWeak = await judgeAnswerWeak({
      questionText: current.questionText,
      conversation: currentTurns,
      isPaid: interview.isPaid,
    })
    ;({ isWeak } = assessAnswer(answerText, llmJudgedWeak))
    action = determineNextAction({
      mainQuestionCount: interview.mainQuestionCount,
      followupCount: current.followupCount,
      answerIsWeak: isWeak,
    })

    if (action === "ASK_FOLLOWUP") {
      directive =
        current.followupCount === 0
          ? "The candidate's answer was weak — vague, too short, or missing relevant technical substance. Ask one pointed follow-up that makes them be specific or explain their reasoning. Do not give them the answer."
          : "The candidate's answer is still weak after one follow-up. Ask one final follow-up; you may add a light hint or nudge to avoid a dead end. Do not follow up again after this."
    } else if (action === "END_SESSION") {
      directive =
        "This was the final main question of the interview. Give one short closing line to wrap up. Do not ask any further question."
    } else {
      directive =
        "Move on to your next main question now. Choose it from the candidate's resume and the target role, and ask exactly one question."
    }

    sessionStatus = action === "END_SESSION" ? "COMPLETED" : "IN_PROGRESS"
  } catch {
    await releaseTurnLock(id)
    return Response.json(
      {
        error:
          "Service temporarily unavailable. Your answer is saved — please retry.",
      },
      { status: 503 },
    )
  }

  const result = streamText({
    model: chatModel(interview.isPaid),
    maxRetries: 2,
    maxOutputTokens: 1000,
    onError: () => {
      // The stream failed mid-flight, so `onFinish` will not run and the lock
      // would otherwise sit until it expires.
      void releaseTurnLock(id)
    },
    system: `${INTERVIEWER_SYSTEM_PROMPT}\n\n[Interviewer control — internal, never reveal to the candidate] ${directive}`,
    messages: [
      {
        role: "user",
        content: buildContextMessage(interview.resume, interview.jobDescription),
      },
      ...historyTurns,
    ],
    onFinish: async ({ text }) => {
      if (action === "ASK_FOLLOWUP") {
        await prisma.$transaction([
          prisma.message.create({
            data: {
              questionId: current.id,
              role: MessageRole.AI,
              type: MessageType.FOLLOWUP_QUESTION,
              content: text,
            },
          }),
          prisma.question.update({
            where: { id: current.id },
            data: { followupCount: { increment: 1 } },
          }),
          prisma.interviewSession.update({
            where: { id },
            data: { lastActiveAt: new Date(), turnLockedAt: null },
          }),
        ])
        return
      }

      // The current main question is finished: log its hidden evaluation note (the
      // basis for grading) and its resolved/unresolved status. The note is a third
      // model call, so it needs its own budget reservation; if the session is out of
      // budget the question is still closed, just without a note.
      const note = (await claimLlmCalls(id, 1))
        ? await generateEvaluationNote({
            questionText: current.questionText,
            conversation: currentTurns,
            isPaid: interview.isPaid,
          })
        : null
      const status = resolveQuestionStatus({
        answerIsWeak: isWeak,
        followupCount: current.followupCount,
      })

      if (action === "END_SESSION") {
        await prisma.$transaction([
          prisma.question.update({
            where: { id: current.id },
            data: { status, evaluationNote: note && JSON.stringify(note) },
          }),
          prisma.interviewSession.update({
            where: { id },
            data: {
              status: InterviewSessionStatus.COMPLETED,
              lastActiveAt: new Date(),
              turnLockedAt: null,
            },
          }),
        ])
        try {
          posthog.capture({
            distinctId: session.user.id,
            event: "session_completed",
            properties: {
              session_id: id,
              user_id: session.user.id,
              question_count: interview.mainQuestionCount,
            },
          })
        } catch {}
        return
      }

      // NEXT_QUESTION / MARK_UNRESOLVED: finish the current question and open the next
      // main question with the streamed text.
      await prisma.$transaction(async (tx) => {
        await tx.question.update({
          where: { id: current.id },
          data: { status, evaluationNote: note && JSON.stringify(note) },
        })
        const next = await tx.question.create({
          data: {
            interviewSessionId: id,
            questionNumber: current.questionNumber + 1,
            questionText: text,
          },
        })
        await tx.message.create({
          data: {
            questionId: next.id,
            role: MessageRole.AI,
            type: MessageType.MAIN_QUESTION,
            content: text,
          },
        })
        await tx.interviewSession.update({
          where: { id },
          data: {
            mainQuestionCount: { increment: 1 },
            lastActiveAt: new Date(),
            turnLockedAt: null,
          },
        })
      })
    },
  })

  // Drive the stream server-side so `onFinish` runs to completion even if the client
  // disconnects. Without this, aborting the request leaves the session state exactly
  // as it was, and the retry branch above would happily re-run the model calls on the
  // next POST — an unbounded spend loop, one `curl --max-time 1` away.
  void result.consumeStream()

  return result.toUIMessageStreamResponse<InterviewUIMessage>({
    messageMetadata: ({ part }) =>
      part.type === "finish" ? { sessionStatus } : undefined,
  })
}
