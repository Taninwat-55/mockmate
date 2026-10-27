import type { Feedback } from "@mockmate/db"

import { MIN_QUESTIONS_FOR_VERDICT } from "@/lib/interview-engine"
import { SIGNAL_LABELS } from "@/types/interview"

import { FeedbackRating } from "./FeedbackRating"
import { LABEL, Note, ROW_VARS, ScoreBar, VerdictStamp } from "./VerdictParts"
import { VerdictSeen } from "./VerdictSeen"

// How each verdict presents (#82). The stamp is told apart by fill and wording,
// never by colour: STRONG HIRE and HIRE are solid ink, NO HIRE is outlined.
const SIGNAL_CONFIG = {
  STRONG_HIRE: {
    eyebrow: "Your result",
    line: "Strong session. This is what a pass looks like.",
    stamp: "solid",
  },
  HIRE: {
    eyebrow: "Your result",
    line: "A pass. Here's what would make it a strong one.",
    stamp: "solid",
  },
  NO_HIRE: {
    eyebrow: "Not this round",
    line: "You're closer than the score suggests. Here's exactly what to work on.",
    stamp: "outline",
  },
  INCOMPLETE: {
    eyebrow: "Your result",
    line: "Too few answers for a verdict. Here's what the panel saw.",
    stamp: null,
  },
} as const satisfies Record<
  Feedback["overallSignal"],
  { eyebrow: string; line: string; stamp: "solid" | "outline" | null }
>

function DimensionRow({
  index,
  title,
  score,
  strength,
  weakness,
  tip,
}: {
  index: 0 | 1 | 2
  title: string
  score: number
  strength: string
  weakness: string
  tip: string
}) {
  return (
    <div
      className={`v-row grid gap-5 border-t border-border py-7 first:border-t-0 md:grid-cols-[12rem_1fr] md:gap-10 ${ROW_VARS[index]}`}
    >
      <div>
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
          {score}
          <span className="text-sm font-normal text-muted-foreground"> / 5</span>
        </p>
        <ScoreBar score={score} />
      </div>
      <div className="space-y-4">
        <Note kind="strength" text={strength} />
        <Note kind="weakness" text={weakness} />
        <Note kind="tip" text={tip} />
      </div>
    </div>
  )
}

export function FeedbackDisplay({
  feedback,
  sessionId,
  title,
  answeredQuestions,
  plannedQuestions,
  play,
  showRating = true,
}: {
  feedback: Feedback
  sessionId: string
  // "Role at Company", shown as the report's heading.
  title: string
  // Main questions with an evaluation note; fewer than planned after an early exit (#63).
  answeredQuestions: number
  // The session plan's total: 5 for a single round, 12 for a loop (#73).
  plannedQuestions: number
  // Whether the verdict moment plays (first view in this browser, #82).
  play: boolean
  // Off in the dev preview, where there's no session to rate.
  showRating?: boolean
}) {
  // Also applied at display time, so feedback graded before #63 (a stored verdict
  // on one or two answers) reads as "Not enough to judge" too.
  const signalKey =
    answeredQuestions < MIN_QUESTIONS_FOR_VERDICT ? "INCOMPLETE" : feedback.overallSignal
  const signal = SIGNAL_CONFIG[signalKey]
  const endedEarly = answeredQuestions < plannedQuestions

  const overall = (
    (feedback.roleKnowledgeScore +
      feedback.communicationClarityScore +
      feedback.problemSolvingScore) /
    3
  ).toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  const date = feedback.createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  return (
    <article
      data-verdict-play={play ? "" : undefined}
      data-verdict={signal.stamp ?? "none"}
    >
      {play && <VerdictSeen sessionId={sessionId} />}

      {/* Verdict hero */}
      <header className="text-center">
        <p className={LABEL}>Interview report</p>
        <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {endedEarly ? "Ended early" : "Completed"} · {date} · {answeredQuestions} of{" "}
          {plannedQuestions} questions
        </p>

        <p className={`mt-10 ${LABEL}`}>{signal.eyebrow}</p>
        {signal.stamp ? (
          <VerdictStamp label={SIGNAL_LABELS[signalKey]} variant={signal.stamp} />
        ) : (
          <p className="v-stamp mt-3 text-3xl font-semibold tracking-tight">
            {SIGNAL_LABELS[signalKey]}
          </p>
        )}

        <div className="v-after">
          <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">{signal.line}</p>
          <p className="mt-4 inline-flex items-baseline gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 font-mono text-xs text-muted-foreground">
            <span className="text-base font-semibold text-foreground tabular-nums">{overall}</span>
            / 5 overall · average of 3
          </p>
          {endedEarly && (
            <p className="mx-auto mt-4 max-w-md text-xs text-muted-foreground">
              Based on {answeredQuestions} of {plannedQuestions} questions. The interview ended
              early, so treat the scores as provisional.
            </p>
          )}
          <p className="mx-auto mt-8 max-w-xl text-pretty text-[17px] leading-relaxed">
            {feedback.overallSummary}
          </p>
        </div>
      </header>

      {/* Where it came from */}
      <section className="mt-12 border-t border-border pt-8">
        <h2 className={LABEL}>Where it came from</h2>
        <div className="mt-2">
          <DimensionRow
            index={0}
            title="Role Knowledge"
            score={feedback.roleKnowledgeScore}
            strength={feedback.roleKnowledgeStrength}
            weakness={feedback.roleKnowledgeWeakness}
            tip={feedback.roleKnowledgeTip}
          />
          <DimensionRow
            index={1}
            title="Communication Clarity"
            score={feedback.communicationClarityScore}
            strength={feedback.communicationClarityStrength}
            weakness={feedback.communicationClarityWeakness}
            tip={feedback.communicationClarityTip}
          />
          <DimensionRow
            index={2}
            title="Problem-solving Approach"
            score={feedback.problemSolvingScore}
            strength={feedback.problemSolvingStrength}
            weakness={feedback.problemSolvingWeakness}
            tip={feedback.problemSolvingTip}
          />
        </div>
      </section>

      {showRating && (
        <div className="mt-4 border-t border-border pt-8">
          <FeedbackRating sessionId={sessionId} initialRating={feedback.userRating} />
        </div>
      )}
    </article>
  )
}
