import Link from "next/link"
import { prisma, InterviewSessionStatus, type OverallSignal } from "@mockmate/db"

import { interviewTitle } from "@/lib/interview-context"
import { MIN_QUESTIONS_FOR_VERDICT } from "@/lib/interview-engine"
import { SIGNAL_LABELS } from "@/types/interview"
import { buttonVariants } from "@/components/ui/button"
import { ScoreBar } from "@/components/interview/VerdictParts"

import { EmptyState } from "./EmptyState"

interface SessionHistoryProps {
  userId: string
}

const STATUS_LABEL: Record<InterviewSessionStatus, string> = {
  COMPLETED: "Completed",
  ABANDONED: "Abandoned",
  IN_PROGRESS: "In progress",
}

// Verdicts told apart by fill, never colour (#82): solid for strong hire,
// outlined for hire, dashed for no hire.
const SIGNAL_BADGE: Record<OverallSignal, string> = {
  STRONG_HIRE: "bg-foreground text-background",
  HIRE: "border border-foreground",
  NO_HIRE: "border border-dashed border-foreground/60",
  INCOMPLETE: "border border-border text-muted-foreground",
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

  if (sessions.length === 0) return <EmptyState />

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-[15px] font-semibold tracking-tight">Past interviews</h2>
        <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          {total}
        </span>
      </div>
      {/* grid-cols-1 is minmax(0, 1fr): without it the column grows to the widest card. */}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sessions.map((session) => {
          const date = session.createdAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
          const { feedback } = session
          const signalKey =
            feedback &&
            (session._count.questions < MIN_QUESTIONS_FOR_VERDICT
              ? "INCOMPLETE"
              : feedback.overallSignal)
          const isCompleted = session.status === InterviewSessionStatus.COMPLETED

          return (
            <li
              key={session.id}
              className="flex flex-col rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold tracking-tight">
                    {interviewTitle(session)}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">{date}</p>
                </div>
                {signalKey ? (
                  <span
                    className={`shrink-0 rounded-md px-2 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] ${SIGNAL_BADGE[signalKey]}`}
                  >
                    {SIGNAL_LABELS[signalKey]}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-md border border-dashed border-foreground/30 px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
                    {STATUS_LABEL[session.status]}
                  </span>
                )}
              </div>

              {feedback ? (
                <dl className="mt-4 space-y-3 border-t border-border pt-4">
                  {([
                    ["Role knowledge", feedback.roleKnowledgeScore],
                    ["Communication", feedback.communicationClarityScore],
                    ["Problem-solving", feedback.problemSolvingScore],
                  ] as const).map(([label, score]) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="font-mono">
                          {score}
                          <span className="text-faint">/5</span>
                        </dd>
                      </div>
                      <ScoreBar score={score} />
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
                  {session.status === InterviewSessionStatus.IN_PROGRESS
                    ? "Still in progress. Pick it up where you left off."
                    : "No report for this one."}
                </p>
              )}

              <div className="mt-auto pt-5">
                {isCompleted ? (
                  <Link
                    href={`/interview/${session.id}/feedback`}
                    className={`w-full ${buttonVariants({ variant: "outline" })}`}
                  >
                    View feedback →
                  </Link>
                ) : session.status === InterviewSessionStatus.IN_PROGRESS ? (
                  <Link
                    href={`/interview/${session.id}`}
                    className={`w-full ${buttonVariants({ variant: "outline" })}`}
                  >
                    Resume interview →
                  </Link>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
      {capped && (
        <p className="mt-4 text-xs text-muted-foreground">
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
