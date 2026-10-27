"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { DiamondOutline } from "@/components/brand/Logo"
import { Button, buttonVariants } from "@/components/ui/button"

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
      <div className="mt-14 space-y-5 text-center">
        <p className="text-sm text-muted-foreground">
          Something went wrong writing your report. Your interview is saved.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
            Back to dashboard
          </Link>
          <Button
            onClick={() => {
              setIsError(false)
              setAttempt((a) => a + 1)
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-14 flex flex-col items-center gap-4 text-muted-foreground" aria-live="polite">
      {/* The stamp's diamond, breathing while the panel writes (still under reduced motion). */}
      <DiamondOutline className="size-8 text-foreground/40 motion-safe:animate-pulse" />
      <p className="font-mono text-xs uppercase tracking-[0.14em]">
        The panel is writing your report
      </p>
    </div>
  )
}
