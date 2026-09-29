"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { StageVerdict } from "@mockmate/db"

import { continueToNextStage, endInterviewEarly } from "@/actions/interview"
import { Button } from "@/components/ui/button"
import type { StageProgress } from "@/lib/interview-engine"

type StageResult = { verdict: StageVerdict; summary: string }

const VERDICT_CONFIG: Record<StageVerdict, { title: (next: string) => string; className: string }> = {
  ADVANCE: {
    title: (next) => `You'd move on to the ${next} round`,
    className: "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-900/20",
  },
  STOP: {
    title: () => "A real company would likely stop here",
    className: "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20",
  },
  INCOMPLETE: {
    title: () => "Not enough to judge this round",
    className: "border-border bg-muted/40",
  },
}

// The soft gate between rounds of a loop (#73): the round's verdict, then the
// candidate's choice. Continuing is always allowed — it's practice — so if the
// verdict can't be loaded, "Continue anyway" appears instead of blocking.
export function RoundGate({
  sessionId,
  endedRound,
  nextRound,
  onContinued,
}: {
  sessionId: string
  endedRound: string // e.g. "screening"
  nextRound: string // e.g. "hiring manager"
  onContinued: (question: { id: string; text: string }, progress: StageProgress) => void
}) {
  const router = useRouter()
  const [result, setResult] = useState<StageResult | null>(null)
  const [failed, setFailed] = useState(false)
  const [pending, setPending] = useState(false)

  // Fetch (or create) the verdict. A 409 right after the round ends means the
  // server hasn't committed the round's end yet, and a 429 that another request is
  // generating it: both clear within seconds, so retry briefly.
  useEffect(() => {
    const controller = new AbortController()
    async function load(attempt: number): Promise<void> {
      try {
        const res = await fetch(`/api/interview/${sessionId}/stage-result`, {
          method: "POST",
          signal: controller.signal,
        })
        if ((res.status === 409 || res.status === 429) && attempt < 5) {
          await new Promise((r) => setTimeout(r, 1500))
          return load(attempt + 1)
        }
        if (!res.ok) throw new Error(String(res.status))
        const body: { stageResult: StageResult } = await res.json()
        setResult(body.stageResult)
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return
        setFailed(true)
      }
    }
    void load(0)
    return () => controller.abort()
  }, [sessionId])

  async function handleContinue() {
    setPending(true)
    try {
      const res = await continueToNextStage(sessionId)
      if (res.success) {
        onContinued(res.question, res.progress)
      } else {
        toast.error(res.error)
      }
    } catch {
      toast.error("Couldn't reach the server. Refresh the page and try again.")
    } finally {
      setPending(false)
    }
  }

  async function handleFinish() {
    setPending(true)
    try {
      const res = await endInterviewEarly(sessionId)
      if (res.success) router.refresh()
      else toast.error(res.error ?? "Couldn't finish the interview.")
    } catch {
      toast.error("Couldn't reach the server. Refresh the page and try again.")
    } finally {
      setPending(false)
    }
  }

  const config = result ? VERDICT_CONFIG[result.verdict] : null

  return (
    <div className="space-y-4 border-t border-border px-4 py-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        The {endedRound} round is done
      </p>

      {!result && !failed && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Reviewing your {endedRound} round…
        </p>
      )}

      {result && config && (
        <div className={`space-y-2 rounded-lg border p-4 ${config.className}`}>
          <p className="text-sm font-semibold">{config.title(nextRound)}</p>
          <p className="text-sm">{result.summary}</p>
        </div>
      )}

      {failed && (
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t load the result for this round. You can still continue.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleContinue} disabled={pending || (!result && !failed)}>
          {failed ? "Continue anyway" : `Continue to the ${nextRound} round`}
        </Button>
        <Button variant="ghost" onClick={handleFinish} disabled={pending}>
          Finish here and get my report
        </Button>
      </div>
    </div>
  )
}
