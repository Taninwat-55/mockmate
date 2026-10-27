import Link from "next/link"
import { Clock } from "lucide-react"
import { prisma, InterviewSessionStatus } from "@mockmate/db"

import { interviewTitle } from "@/lib/interview-context"
import { plannedQuestions, stageProgress } from "@/lib/interview-engine"
import { STAGE_LABELS } from "@/types/interview"
import { buttonVariants } from "@/components/ui/button"

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

  const asked = session.questions.length
  const planned = plannedQuestions(session.stages)

  // The slim "pick up where you left off" strip from Direction A (#87).
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border border-l-[3px] border-l-foreground bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <Clock className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {nextStage
              ? `Round ${progress.round} of ${progress.rounds} done. The ${STAGE_LABELS[nextStage].toLowerCase()} round is next`
              : "Pick up where you left off"}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{interviewTitle(session)}</span>
            {" · "}
            question {asked} of {planned}
            {until && ` · continue by ${until}`}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        {/* One segment per planned question, like the score bars. */}
        <div className="hidden w-32 gap-1 sm:flex" aria-hidden="true">
          {Array.from({ length: planned }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < asked ? "bg-foreground" : "bg-border"}`}
            />
          ))}
        </div>
        <Link href={`/interview/${session.id}`} className={buttonVariants({ size: "sm" })}>
          {nextStage ? "Continue" : "Resume interview"} →
        </Link>
      </div>
    </div>
  )
}
