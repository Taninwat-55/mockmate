"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { toast } from "sonner"

import { startInterview, endInterviewEarly } from "@/actions/interview"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Stage } from "@mockmate/db"

import { RoundGate } from "@/components/interview/RoundGate"
import type { StageProgress } from "@/lib/interview-engine"
import { STAGE_LABELS } from "@/types/interview"
import type { InterviewUIMessage } from "@/types/interview-chat"

const MAX_ANSWER_CHARS = 2000

// Fixed locale so server and client render the same separator (avoids a hydration
// mismatch); mirrors NewInterviewForm.
const formatCount = (n: number) => n.toLocaleString("en-US")

// Flatten a UIMessage's text parts into a single string for rendering / for the slim
// request body the transport sends.
function textOf(message: InterviewUIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
}

// "Question 2 of 5", or "Round 2 of 3 · Question 2 of 4" in a multi-round loop.
// Before the opening question arrives the round has 0 questions; show 1.
function progressLabel(p: StageProgress): string {
  const question = `Question ${Math.max(p.question, 1)} of ${p.questions}`
  return p.rounds > 1 ? `Round ${p.round} of ${p.rounds} · ${question}` : question
}

// One dot per main question in the round: done, current (ring), still to come.
function ProgressDots({ p }: { p: StageProgress }) {
  const current = Math.max(p.question, 1)
  return (
    <span className="hidden items-center gap-1.5 sm:flex" aria-hidden="true">
      {Array.from({ length: p.questions }, (_, i) => (
        <span
          key={i}
          className={`size-1.5 rounded-full ${
            i + 1 < current
              ? "bg-foreground"
              : i + 1 === current
                ? "ring-[1.5px] ring-foreground"
                : "bg-border"
          }`}
        />
      ))}
    </span>
  )
}

export function InterviewChat({
  header,
  sessionId,
  initialMessages,
  initialProgress,
  stages,
  initialRoundEnded,
}: {
  // Left side of the top bar (logo, role, tier), rendered by the server page.
  header: React.ReactNode
  sessionId: string
  initialMessages: InterviewUIMessage[]
  initialProgress: StageProgress
  stages: Stage[]
  // True when the page loads between rounds of a loop (#73): show the gate.
  initialRoundEnded: boolean
}) {
  const router = useRouter()
  const [progress, setProgress] = useState(initialProgress)
  const [betweenRounds, setBetweenRounds] = useState(initialRoundEnded)
  // The interview just ended: stay on the closing line until the candidate opens
  // their results, instead of jumping away before they can read it.
  const [completed, setCompleted] = useState(false)
  const [input, setInput] = useState("")
  const [timedOut, setTimedOut] = useState(false)
  const [opening, setOpening] = useState(initialMessages.length === 0)
  const startedRef = useRef(false)
  const endRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, regenerate, status, setMessages } =
    useChat<InterviewUIMessage>({
      messages: initialMessages,
      transport: new DefaultChatTransport<InterviewUIMessage>({
        api: `/api/interview/${sessionId}`,
        // The server rebuilds context from the DB, so it only needs the latest answer.
        prepareSendMessagesRequest: ({ messages }) => {
          const lastUser = [...messages].reverse().find((m) => m.role === "user")
          return { body: { message: lastUser ? textOf(lastUser) : "" } }
        },
      }),
      onFinish: ({ message }) => {
        if (message.metadata?.progress) setProgress(message.metadata.progress)
        if (message.metadata?.roundEnded) setBetweenRounds(true)
        // The last answer flips the session to COMPLETED server-side. Keep the chat
        // on the closing line; "See your results" then refreshes into the report.
        if (message.metadata?.sessionStatus === "COMPLETED") setCompleted(true)
      },
      onError: () => {
        toast.error(
          "We're experiencing high traffic. Your progress is saved. Click Retry to continue.",
        )
      },
    })

  const busy = status === "submitted" || status === "streaming"
  const hasError = status === "error"

  // Seed the opening question once on first mount (non-streaming Server Action).
  useEffect(() => {
    if (initialMessages.length > 0 || startedRef.current) return
    startedRef.current = true
    startInterview(sessionId)
      .then((result) => {
        if (result.success) {
          setMessages([
            {
              id: result.question.id,
              role: "assistant",
              parts: [{ type: "text", text: result.question.text }],
            },
          ])
        } else {
          toast.error(result.error)
        }
      })
      .catch(() => toast.error("Couldn't reach the server. Refresh the page and try again."))
      .finally(() => setOpening(false))
  }, [initialMessages.length, sessionId, setMessages])

  // First-token timeout (PRD §7): if nothing has started streaming within 5s of
  // submitting, surface a retry affordance. `showRetry` gates on the still-submitted
  // status, so once the stream starts the banner clears on its own.
  useEffect(() => {
    if (status !== "submitted") return
    const timer = setTimeout(() => setTimedOut(true), 5000)
    return () => clearTimeout(timer)
  }, [status])

  // Keep the latest turn in view. Instant under reduced motion.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    endRef.current?.scrollIntoView({ block: "end", behavior: reduce ? "auto" : "smooth" })
  }, [messages.length, status])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    setTimedOut(false)
    setInput("")
    sendMessage({ text })
  }

  async function handleEndEarly() {
    try {
      const result = await endInterviewEarly(sessionId)
      if (result.success) {
        router.refresh()
      } else {
        toast.error(result.error ?? "Couldn't end the interview.")
      }
    } catch {
      // Thrown, not returned: stale action ID after a deploy, or a network error.
      toast.error("Couldn't end the interview. Refresh the page and try again.")
    }
  }

  const showRetry = hasError || (timedOut && status === "submitted")

  // The pinned prompt is the interviewer's latest turn (Direction B, #89); the
  // transcript below holds everything before it, so nothing shows twice.
  const lastInterviewerIndex = messages.findLastIndex((m) => m.role === "assistant")
  const pinned = lastInterviewerIndex >= 0 ? messages[lastInterviewerIndex] : undefined
  const transcript = messages.filter((_, i) => i !== lastInterviewerIndex)
  const pinnedText = pinned ? textOf(pinned) : ""

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-10 bg-background">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          {header}
          <div className="flex shrink-0 items-center gap-3">
            <ProgressDots p={progress} />
            {!completed && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleEndEarly}
                disabled={opening}
              >
                End interview
              </Button>
            )}
          </div>
        </header>

        <div className="border-b border-border border-l-[3px] border-l-pen bg-muted/60 px-4 py-5 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint" aria-live="polite">
              {completed ? "Interview over" : progressLabel(progress)}
            </p>
            <p className="mt-2 max-h-[40vh] overflow-y-auto text-[17px] leading-relaxed whitespace-pre-wrap sm:text-lg">
              {opening && !pinned
                ? "Preparing your first question…"
                : pinnedText || (status === "streaming" ? "…" : "")}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        {transcript.length > 0 && (
          <p className="mb-5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
            Transcript
          </p>
        )}
        <div className="space-y-4">
          {transcript.map((message) => {
            const isInterviewer = message.role === "assistant"
            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isInterviewer ? "justify-start" : "justify-end"}`}
              >
                {isInterviewer && (
                  <span
                    className="mt-1 grid size-6 shrink-0 place-items-center rounded-md bg-foreground font-mono text-[11px] font-semibold text-background"
                    aria-hidden="true"
                  >
                    M
                  </span>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    isInterviewer ? "border border-border bg-card" : "bg-muted"
                  }`}
                >
                  <span className="sr-only">{isInterviewer ? "Interviewer: " : "You: "}</span>
                  {textOf(message)}
                </div>
              </div>
            )
          })}
        </div>

        {status === "submitted" && !timedOut && (
          <p className="mt-6 text-center font-mono text-xs text-muted-foreground">Thinking…</p>
        )}

        {showRetry && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {timedOut
                ? "This is taking longer than expected. Your progress is saved."
                : "Something went wrong. Your progress is saved."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTimedOut(false)
                regenerate()
              }}
            >
              Retry
            </Button>
          </div>
        )}
        {/* Margin keeps the latest turn clear of the sticky composer when scrolled to. */}
        <div ref={endRef} className="scroll-mb-56" />
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background">
        {completed ? (
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <p className="text-sm text-muted-foreground">The interview is over.</p>
            <Button onClick={() => router.refresh()}>See your results →</Button>
          </div>
        ) : betweenRounds && stages[progress.round] ? (
          <RoundGate
            sessionId={sessionId}
            endedRound={STAGE_LABELS[progress.stage].toLowerCase()}
            nextRound={STAGE_LABELS[stages[progress.round]].toLowerCase()}
            onContinued={(question, next) => {
              setMessages((prev) => [
                ...prev,
                { id: question.id, role: "assistant", parts: [{ type: "text", text: question.text }] },
              ])
              setProgress(next)
              setBetweenRounds(false)
            }}
          />
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
            {busy && (
              <p className="mb-2 font-mono text-xs text-muted-foreground" aria-live="polite">
                MockMate is responding. Your next answer opens when it&apos;s done.
              </p>
            )}
            <div className="rounded-xl border border-input bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
              <label htmlFor="answer" className="sr-only">
                Your answer
              </label>
              <Textarea
                id="answer"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
                  }
                }}
                placeholder={busy ? "Waiting for MockMate…" : "Type your answer…"}
                maxLength={MAX_ANSWER_CHARS}
                disabled={busy || opening}
                className="max-h-64 min-h-20 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
              <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {formatCount(input.length)} / {formatCount(MAX_ANSWER_CHARS)}
                </span>
                <div className="flex items-center gap-3">
                  <span className="hidden font-mono text-[11px] text-faint sm:inline">
                    ↵ to submit · ⇧↵ new line
                  </span>
                  <Button type="submit" size="sm" disabled={busy || opening || !input.trim()}>
                    {busy ? "Sending…" : "Submit answer →"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
