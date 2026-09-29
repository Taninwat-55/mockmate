import Link from "next/link"
import { prisma, InterviewSessionStatus } from "@mockmate/db"

import { interviewTitle } from "@/lib/interview-context"
import { stageProgress } from "@/lib/interview-engine"
import { STAGE_LABELS } from "@/types/interview"

// How long a loop may wait between rounds before the cron closes it (#73).
const BETWEEN_ROUNDS_DAYS = 7

interface ResumeBannerProps {
  userId: string
}

export async function ResumeBanner({ userId }: ResumeBannerProps) {
  const session = await prisma.interviewSession.findFirst({
    where: { userId, status: InterviewSessionStatus.IN_PROGRESS },
    orderBy: { lastActiveAt: "desc" },
    select: {
      id: true,
      title: true,
      company: true,
      stages: true,
      roundEndedAt: true,
      questions: { select: { stage: true }, orderBy: { questionNumber: "asc" } },
    },
  })

  if (!session) return null

  // Between rounds of a loop: say which round is next and how long it can wait.
  const progress = stageProgress(session.stages, session.questions)
  const nextStage = session.roundEndedAt ? session.stages[progress.round] : undefined
  const until =
    session.roundEndedAt &&
    new Date(session.roundEndedAt.getTime() + BETWEEN_ROUNDS_DAYS * 86_400_000).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
    })

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/30 dark:bg-amber-900/20">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            {nextStage
              ? `Round ${progress.round} of ${progress.rounds} done — the ${STAGE_LABELS[nextStage].toLowerCase()} round is next`
              : "You have an unfinished interview"}
          </p>
          <p className="mt-0.5 truncate text-xs text-amber-700 dark:text-amber-400">
            {interviewTitle(session)}
            {until && ` · continue by ${until}`}
          </p>
        </div>
        <Link
          href={`/interview/${session.id}`}
          className="shrink-0 rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-amber-50 transition-opacity hover:opacity-80 dark:bg-amber-200 dark:text-amber-900"
        >
          {nextStage ? "Continue →" : "Resume interview →"}
        </Link>
      </div>
    </div>
  )
}
