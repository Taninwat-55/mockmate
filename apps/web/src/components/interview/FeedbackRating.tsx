"use client"

import { useState } from "react"
import { toast } from "sonner"

import { submitFeedbackRating } from "@/actions/feedback"

export function FeedbackRating({
  sessionId,
  initialRating,
}: {
  sessionId: string
  initialRating: number | null
}) {
  const [rating, setRating] = useState<number | null>(initialRating)
  const [saving, setSaving] = useState(false)

  async function handleRate(value: number) {
    setSaving(true)
    const result = await submitFeedbackRating(sessionId, value)
    if (result.success) {
      setRating(value)
    } else {
      toast.error("Failed to save your rating.")
    }
    setSaving(false)
  }

  return (
    <div className="rounded-lg border border-border p-5 space-y-3">
      <p className="text-sm font-medium">How useful was this feedback?</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            disabled={saving}
            onClick={() => void handleRate(value)}
            className={`h-9 w-9 rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${
              rating === value
                ? "bg-primary text-primary-foreground"
                : "border border-border hover:bg-muted"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
      {rating !== null && (
        <p className="text-xs text-muted-foreground">Thanks for your rating!</p>
      )}
    </div>
  )
}
