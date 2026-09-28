import type { Feedback } from "@mockmate/db"

import { MAX_MAIN_QUESTIONS, MIN_QUESTIONS_FOR_VERDICT } from "@/lib/interview-engine"

import { FeedbackRating } from "./FeedbackRating"

const SIGNAL_CONFIG = {
  STRONG_HIRE: {
    label: "Strong Hire",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  HIRE: {
    label: "Hire",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  NO_HIRE: {
    label: "No Hire",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  INCOMPLETE: {
    label: "Not enough to judge",
    className: "bg-muted text-muted-foreground",
  },
} as const satisfies Record<Feedback["overallSignal"], { label: string; className: string }>

const SCORE_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"] as const

function ScoreBadge({ score }: { score: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-2xl font-bold tabular-nums">{score}</span>
      <span className="text-sm text-muted-foreground">/ 5 — {SCORE_LABELS[score]}</span>
    </div>
  )
}

function Pill({
  label,
  className,
}: {
  label: string
  className: string
}) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}

function DimensionCard({
  title,
  score,
  strength,
  weakness,
  tip,
}: {
  title: string
  score: number
  strength: string
  weakness: string
  tip: string
}) {
  return (
    <div className="rounded-lg border border-border p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-medium">{title}</h3>
        <ScoreBadge score={score} />
      </div>
      <div className="space-y-2.5 text-sm">
        <div className="flex items-start gap-2">
          <Pill
            label="Strength"
            className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
          />
          <p>{strength}</p>
        </div>
        <div className="flex items-start gap-2">
          <Pill
            label="Weakness"
            className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
          />
          <p>{weakness}</p>
        </div>
        <div className="flex items-start gap-2">
          <Pill
            label="Tip"
            className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
          />
          <p>{tip}</p>
        </div>
      </div>
    </div>
  )
}

export function FeedbackDisplay({
  feedback,
  sessionId,
  answeredQuestions,
}: {
  feedback: Feedback
  sessionId: string
  // Main questions with an evaluation note; fewer than 5 after an early exit (#63).
  answeredQuestions: number
}) {
  // Also applied at display time, so feedback graded before #63 (a stored verdict
  // on one or two answers) reads as "Not enough to judge" too.
  const signal =
    SIGNAL_CONFIG[
      answeredQuestions < MIN_QUESTIONS_FOR_VERDICT ? "INCOMPLETE" : feedback.overallSignal
    ]

  return (
    <div className="space-y-4">
      {/* Overall result */}
      <div className="rounded-lg border border-border p-5 space-y-3">
        <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${signal.className}`}>
          {signal.label}
        </span>
        {answeredQuestions < MAX_MAIN_QUESTIONS && (
          <p className="text-xs text-muted-foreground">
            Based on {answeredQuestions} of {MAX_MAIN_QUESTIONS} questions — the
            interview ended early, so treat the scores as provisional.
          </p>
        )}
        <p className="text-sm">{feedback.overallSummary}</p>
      </div>

      {/* Dimension cards */}
      <DimensionCard
        title="Role Knowledge"
        score={feedback.roleKnowledgeScore}
        strength={feedback.roleKnowledgeStrength}
        weakness={feedback.roleKnowledgeWeakness}
        tip={feedback.roleKnowledgeTip}
      />
      <DimensionCard
        title="Communication Clarity"
        score={feedback.communicationClarityScore}
        strength={feedback.communicationClarityStrength}
        weakness={feedback.communicationClarityWeakness}
        tip={feedback.communicationClarityTip}
      />
      <DimensionCard
        title="Problem-Solving Approach"
        score={feedback.problemSolvingScore}
        strength={feedback.problemSolvingStrength}
        weakness={feedback.problemSolvingWeakness}
        tip={feedback.problemSolvingTip}
      />

      {/* User rating */}
      <FeedbackRating sessionId={sessionId} initialRating={feedback.userRating} />
    </div>
  )
}
