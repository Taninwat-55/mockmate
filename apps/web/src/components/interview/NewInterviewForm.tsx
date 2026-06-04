"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createInterviewSession } from "@/actions/interview"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const MAX_INPUT_CHARS = 6000

// Fixed locale so the server and client render the same separator (otherwise the
// thousands separator differs by locale and React reports a hydration mismatch).
const formatCount = (n: number) => n.toLocaleString("en-US")

function CharCount({ value }: { value: string }) {
  const over = value.length > MAX_INPUT_CHARS
  return (
    <span
      className={`text-xs tabular-nums ${
        over ? "text-destructive" : "text-muted-foreground"
      }`}
    >
      {formatCount(value.length)} / {formatCount(MAX_INPUT_CHARS)}
    </span>
  )
}

export function NewInterviewForm() {
  const [title, setTitle] = useState("")
  const [resume, setResume] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    startTransition(async () => {
      const result = await createInterviewSession({ title, resume, jobDescription })
      // On success the action redirects, so we only get here on failure.
      if (result && !result.success) {
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-6 text-left">
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Role / Company
        </label>
        <Input
          id="title"
          placeholder="Frontend Engineer at Spotify"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="resume" className="text-sm font-medium">
            Your resume
          </label>
          <CharCount value={resume} />
        </div>
        <Textarea
          id="resume"
          placeholder="Paste your resume as plain text…"
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          disabled={isPending}
          className="min-h-40"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="jobDescription" className="text-sm font-medium">
            Job description
          </label>
          <CharCount value={jobDescription} />
        </div>
        <Textarea
          id="jobDescription"
          placeholder="Paste the job description you're targeting…"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          disabled={isPending}
          className="min-h-40"
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Starting…" : "Start Interview"}
      </Button>
    </form>
  )
}
