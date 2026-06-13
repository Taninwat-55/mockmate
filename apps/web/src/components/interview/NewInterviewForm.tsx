"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { FileUp } from "lucide-react"
import { toast } from "sonner"

import { updateSavedResume } from "@/actions/account"
import { createInterviewSession } from "@/actions/interview"
import { extractPdfText } from "@/lib/parse-pdf"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const MAX_INPUT_CHARS = 6000
// Guard against a huge PDF locking up the tab — parsing happens in the browser.
const MAX_PDF_BYTES = 10 * 1024 * 1024 // 10 MB

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

type NewInterviewFormProps = {
  // Resume text saved from a previous PDF upload; pre-fills the textarea.
  savedResume?: string
  // Billing entitlement (#16): how many Pro credits the user holds, and whether
  // their weekly free session is currently available.
  credits: number
  freeAvailable: boolean
}

export function NewInterviewForm({
  savedResume = "",
  credits,
  freeAvailable,
}: NewInterviewFormProps) {
  const [title, setTitle] = useState("")
  const [resume, setResume] = useState(savedResume)
  const [jobDescription, setJobDescription] = useState("")
  const [isParsing, setIsParsing] = useState(false)
  const [isPending, startTransition] = useTransition()
  // The user's pick when they hold both a credit and a free session. Defaults to
  // the free session so a credit is never spent without an explicit choice.
  const [preferCredit, setPreferCredit] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // The saved CV is showing as long as the user hasn't edited it.
  const usingSavedResume = savedResume.length > 0 && resume === savedResume
  const busy = isPending || isParsing

  const hasCredit = credits > 0
  const bothAvailable = hasCredit && freeAvailable
  const onlyCredit = hasCredit && !freeAvailable
  const onlyFree = !hasCredit && freeAvailable
  const blocked = !hasCredit && !freeAvailable

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // let the same file be picked again after an edit
    if (!file) return

    // Some OSes report an empty MIME for a valid PDF, so fall back to the extension.
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      toast.error("Please choose a PDF file.")
      return
    }
    if (file.size > MAX_PDF_BYTES) {
      toast.error("That PDF is too large — please use one under 10 MB.")
      return
    }

    setIsParsing(true)
    try {
      const text = await extractPdfText(file)
      if (!text) {
        toast.error("Couldn't read any text from that PDF — paste it instead.")
        return
      }
      setResume(text) // fill the box first so nothing is lost, whatever the length
      if (text.length > MAX_INPUT_CHARS) {
        // Too long to save or start; the text is already in the textarea to trim.
        toast.warning(
          `Your CV is ${formatCount(text.length)} characters — trim it to ${formatCount(
            MAX_INPUT_CHARS,
          )} to save and start.`,
        )
        return
      }
      const result = await updateSavedResume({ resume: text })
      if (result.success) {
        toast.success("CV uploaded and saved.")
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Couldn't read that PDF — paste your resume instead.")
    } finally {
      setIsParsing(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    startTransition(async () => {
      const result = await createInterviewSession({
        title,
        resume,
        jobDescription,
        // Only meaningful when both are available; otherwise the server decides.
        preferCredit: bothAvailable ? preferCredit : undefined,
      })
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
          disabled={busy}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="resume" className="text-sm font-medium">
            Your resume
          </label>
          <div className="flex items-center gap-3">
            <CharCount value={resume} />
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="size-4" />
              {isParsing ? "Reading…" : "Upload PDF"}
            </Button>
          </div>
        </div>
        <Textarea
          id="resume"
          placeholder="Paste your resume as plain text…"
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          disabled={busy}
          className="min-h-40"
        />
        {usingSavedResume && (
          <p className="text-xs text-muted-foreground">
            Using saved CV — paste to override.
          </p>
        )}
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
          disabled={busy}
          className="min-h-40"
        />
      </div>

      {bothAvailable && (
        <fieldset className="space-y-2 rounded-lg border border-border p-3">
          <legend className="px-1 text-xs font-medium text-muted-foreground">
            This interview
          </legend>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="radio"
              name="tier"
              checked={!preferCredit}
              onChange={() => setPreferCredit(false)}
              disabled={busy}
              className="mt-1"
            />
            <span>
              <span className="font-medium">Free weekly session</span> — base
              model (Flash). Resets every 7 days.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="radio"
              name="tier"
              checked={preferCredit}
              onChange={() => setPreferCredit(true)}
              disabled={busy}
              className="mt-1"
            />
            <span>
              <span className="font-medium">Use 1 credit — Pro interview</span> —
              sharper interviewer and grading. You have {credits}.
            </span>
          </label>
        </fieldset>
      )}

      {onlyCredit && (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          This uses{" "}
          <span className="font-medium text-foreground">1 credit</span> for a Pro
          interview — you have {credits}.
        </p>
      )}

      {onlyFree && (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Using your{" "}
          <span className="font-medium text-foreground">free weekly session</span>{" "}
          (base model).{" "}
          <Link href="/buy" className="underline">
            Buy credits
          </Link>{" "}
          for the Pro experience.
        </p>
      )}

      {blocked && (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <p className="text-muted-foreground">
            You&apos;ve used your free session this week and have no credits.
          </p>
          <Link
            href="/buy"
            className="mt-1 inline-block font-medium underline"
          >
            Buy credits to start now →
          </Link>
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={busy || blocked}
      >
        {isPending ? "Starting…" : blocked ? "Out of sessions" : "Start Interview"}
      </Button>
    </form>
  )
}
