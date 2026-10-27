import Link from "next/link"
import { prisma, InterviewSessionStatus } from "@mockmate/db"

import { interviewTitle } from "@/lib/interview-context"
import { MIN_QUESTIONS_FOR_VERDICT } from "@/lib/interview-engine"
import { SIGNAL_LABELS } from "@/types/interview"

interface SessionHistoryProps {
  userId: string
}

const STATUS_LABEL: Record<InterviewSessionStatus, string> = {
  COMPLETED: "Completed",
  ABANDONED: "Abandoned",
  IN_PROGRESS: "In progress",
}

const STATUS_CLASS: Record<InterviewSessionStatus, string> = {
  COMPLETED:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  ABANDONED: "bg-muted text-muted-foreground",
  IN_PROGRESS:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
}

// Free users see only their most recent sessions; anyone who has ever bought
// credits keeps full history (#16).
const FREE_HISTORY_LIMIT = 3

export async function SessionHistory({ userId }: SessionHistoryProps) {
  const [hasPaidHistory, total] = await Promise.all([
    prisma.creditPurchase.count({ where: { userId } }).then((n) => n > 0),
    prisma.interviewSession.count({ where: { userId } }),
  ])
  const capped = !hasPaidHistory && total > FREE_HISTORY_LIMIT

  const sessions = await prisma.interviewSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: hasPaidHistory ? undefined : FREE_HISTORY_LIMIT,
    select: {
      id: true,
      title: true,
      company: true,
      status: true,
      createdAt: true,
      feedback: {
        select: {
          overallSignal: true,
          roleKnowledgeScore: true,
          communicationClarityScore: true,
          problemSolvingScore: true,
        },
      },
      // Same rule as the feedback page: too few graded answers means no verdict (#63).
      _count: { select: { questions: { where: { evaluationNote: { not: null } } } } },
    },
  })

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No interviews yet. Start one above.
      </p>
    )
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {sessions.map((session) => {
        const date = session.createdAt.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })

        const { feedback } = session
        const signal =
          feedback &&
          SIGNAL_LABELS[
            session._count.questions < MIN_QUESTIONS_FOR_VERDICT
              ? "INCOMPLETE"
              : feedback.overallSignal
          ]

        const row = (
          <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{interviewTitle(session)}</p>
              {feedback && (
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  Role {feedback.roleKnowledgeScore}/5 · Communication{" "}
                  {feedback.communicationClarityScore}/5 · Problem-solving{" "}
                  {feedback.problemSolvingScore}/5
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
              {signal ? (
                <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium">
                  {signal}
                </span>
              ) : (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[session.status]}`}
                >
                  {STATUS_LABEL[session.status]}
                </span>
              )}
              <span className="text-muted-foreground">{date}</span>
            </div>
          </div>
        )

        return (
          <li key={session.id}>
            {session.status === InterviewSessionStatus.COMPLETED ? (
              <Link
                href={`/interview/${session.id}/feedback`}
                className="block hover:opacity-80 transition-opacity"
              >
                {row}
              </Link>
            ) : (
              row
            )}
          </li>
        )
        })}
      </ul>
      {capped && (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing your {FREE_HISTORY_LIMIT} most recent.{" "}
          <Link href="/buy" className="underline">
            Buy credits
          </Link>{" "}
          to keep your full history.
        </p>
      )}
    </>
  )
}
