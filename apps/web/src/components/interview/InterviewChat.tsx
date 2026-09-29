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

export function InterviewChat({
  sessionId,
  initialMessages,
  initialProgress,
  stages,
  initialRoundEnded,
}: {
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
          "We're experiencing high traffic. Your progress is saved — click Retry to continue.",
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

  return (
    <div className="flex flex-1 flex-col">
      <p className="border-b border-border px-4 py-2 text-xs text-muted-foreground" aria-live="polite">
        {progressLabel(progress)}
      </p>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        {opening && messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Preparing your first question…
          </p>
        ) : (
          messages.map((message) => {
            const isInterviewer = message.role === "assistant"
            return (
              <div
                key={message.id}
                className={`flex ${isInterviewer ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    isInterviewer
                      ? "bg-muted text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {textOf(message) || (isInterviewer && status === "streaming" ? "…" : "")}
                </div>
              </div>
            )
          })
        )}

        {status === "submitted" && !timedOut && (
          <p className="text-center text-xs text-muted-foreground">Thinking…</p>
        )}

        {showRetry && (
          <div className="flex flex-col items-center gap-2 py-2">
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
      </div>

      {completed ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4">
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
        <form
          onSubmit={handleSubmit}
          className="space-y-2 border-t border-border px-4 py-4"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
              }
            }}
            placeholder="Type your answer… (Enter to send, Shift+Enter for a new line)"
            maxLength={MAX_ANSWER_CHARS}
            disabled={busy || opening}
            className="min-h-24"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatCount(input.length)} / {formatCount(MAX_ANSWER_CHARS)}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleEndEarly}
                disabled={opening}
              >
                End Interview Early
              </Button>
              <Button type="submit" size="sm" disabled={busy || opening || !input.trim()}>
                {busy ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
