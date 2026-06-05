"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export function FeedbackGenerator({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [isError, setIsError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  // Mirrors the .then() pattern from InterviewChat (startInterview effect) so the
  // setState call happens in a Promise callback, not synchronously within the effect.
  // AbortController cleans up in-flight requests on unmount and on React StrictMode's
  // second mount — prevents the duplicate request from racing to create the Feedback row.
  useEffect(() => {
    const controller = new AbortController()

    fetch(`/api/interview/${sessionId}/feedback`, {
      method: "POST",
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error()
        router.refresh()
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return
        setIsError(true)
        toast.error("Failed to generate feedback. Your session is saved.")
      })

    return () => controller.abort()
  }, [sessionId, router, attempt])

  if (isError) {
    return (
      <div className="space-y-4 rounded-lg border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Something went wrong generating your feedback.
        </p>
        <Button
          onClick={() => {
            setIsError(false)
            setAttempt((a) => a + 1)
          }}
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <span className="text-sm">Generating your feedback…</span>
    </div>
  )
}
