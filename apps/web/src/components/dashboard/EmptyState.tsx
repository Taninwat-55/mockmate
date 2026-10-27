import Link from "next/link"

import { DiamondOutline } from "@/components/brand/Logo"
import { buttonVariants } from "@/components/ui/button"

const STEPS = [
  { title: "Pick your role", body: "Type the job you're going for. The CV and posting are optional." },
  { title: "Sit the interview", body: "Five questions, with follow-ups when an answer is vague." },
  { title: "Read the verdict", body: "Three scores, a hiring signal, and what to do next time." },
] as const

// First visit, no interviews yet (#87).
export function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-foreground/20 px-6 py-12 text-center">
      <DiamondOutline className="mx-auto size-10 text-foreground/30" />
      <h2 className="mt-5 text-xl font-semibold tracking-tight">No interviews yet. Let&apos;s change that.</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Your first mock interview takes about 15 minutes. Here&apos;s how it works.
      </p>
      <ol className="mx-auto mt-8 grid max-w-3xl gap-6 text-left sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full border-[1.5px] border-foreground font-mono text-xs font-medium">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link href="/interview/new" className={`mt-8 ${buttonVariants({ size: "lg" })}`}>
        Start your first interview →
      </Link>
    </div>
  )
}
