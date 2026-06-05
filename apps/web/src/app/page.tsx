import { redirect } from "next/navigation"
import Link from "next/link"

import { auth } from "@/auth"

export default async function Home() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="inline-block size-4 rotate-45 border-[1.5px] border-foreground" />
            <span className="text-[19px] font-semibold tracking-[-0.02em]">MockMate</span>
          </a>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#how" className="text-sm text-muted-foreground transition-colors hover:text-foreground">How it works</a>
            <a href="#why" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Why it works</a>
            <a href="#report" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Sample report</a>
            <a href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Pricing</a>
            <a href="#faq" className="text-sm text-muted-foreground transition-colors hover:text-foreground">FAQ</a>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline">Sign in</Link>
            <Link href="/login" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90">
              Start free
            </Link>
          </div>
        </nav>
      </header>

      <main id="top">
        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-20 md:py-28 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
                AI-powered mock interviews
              </p>
              <h1 className="text-balance text-[44px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[56px] lg:text-[60px]">
                Beat the freeze.<br />
                Practice the pressure<br />
                before it counts.
              </h1>
              <p className="mt-7 max-w-[46ch] text-[17px] leading-relaxed text-muted-foreground">
                You know the material. You just blank when someone&apos;s watching.
                MockMate runs a real technical interview tailored to the exact job
                you&apos;re chasing — then grades you like a hiring panel would.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90">
                  Start your first interview&nbsp;→
                </Link>
                <a href="#report" className="text-sm font-medium text-foreground underline-offset-4 hover:underline">
                  See a sample report ↓
                </a>
              </div>
              <p className="mt-6 font-mono text-[12px] text-faint">
                No credit card&nbsp; ·&nbsp; ~15 minutes&nbsp; ·&nbsp; Your résumé stays yours
              </p>
            </div>

            {/* Mock interview card */}
            <div className="reveal">
              <div className="rounded-xl border border-border bg-background shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_-12px_rgba(0,0,0,0.12)]">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-2.5 shrink-0 rotate-45 border border-foreground" />
                    <span className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                      Frontend Engineer
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex gap-1">
                      <span className="size-1.5 rounded-full bg-foreground" />
                      <span className="size-1.5 rounded-full bg-foreground" />
                      <span className="size-1.5 rounded-full bg-border" />
                      <span className="size-1.5 rounded-full bg-border" />
                      <span className="size-1.5 rounded-full bg-border" />
                    </div>
                    <span className="whitespace-nowrap font-mono text-[11px] text-faint">Q2 / 5</span>
                  </div>
                </div>
                <div className="space-y-5 p-5">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
                        Question 2
                      </span>
                      <span className="whitespace-nowrap rounded-[5px] border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                        Follow-up 1
                      </span>
                    </div>
                    <div className="rounded-lg border border-foreground bg-foreground/[0.02] p-4 text-[15px] leading-relaxed">
                      You mentioned a composite index on{" "}
                      <span className="font-mono text-[13.5px]">(org_id, created_at)</span>.
                      {" "}How did you choose that column order, and what was the measured
                      impact on p95 latency?
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/60 p-4">
                    <p className="text-[14.5px] leading-relaxed text-foreground/80">
                      The order matters because every query filters by{" "}
                      <span className="font-mono text-[12.5px]">org_id</span> first, then
                      range-scans <span className="font-mono text-[12.5px]">created_at</span>
                      {" "}— so leading with org_id lets the index seek straight to the tenant
                      <span className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] animate-pulse bg-foreground" />
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <span className="font-mono text-[11px] text-faint">0:42 · 128 words</span>
                      <span className="inline-flex h-7 items-center rounded-md bg-primary px-3 font-mono text-[11px] font-medium text-primary-foreground">
                        Submit answer →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────── */}
        <section id="how" className="border-t border-border bg-muted/40">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <div className="reveal max-w-2xl">
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">How it works</p>
              <h2 className="text-balance text-[34px] font-semibold leading-[1.08] tracking-[-0.025em] sm:text-[40px]">
                Three steps to a verdict.
              </h2>
            </div>
            <div className="reveal mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
              {steps.map(({ n, title, body }) => (
                <div key={n} className="bg-background p-7">
                  <span className="inline-grid size-9 place-items-center rounded-full border-[1.6px] border-foreground font-mono text-[14px] font-medium">
                    {n}
                  </span>
                  <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.01em]">{title}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHY IT WORKS ─────────────────────────────────────── */}
        <section id="why" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <div className="reveal grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">Why it works</p>
                <h2 className="text-balance text-[34px] font-semibold leading-[1.08] tracking-[-0.025em] sm:text-[40px]">
                  It interviews you for the job you actually want.
                </h2>
                <p className="mt-6 max-w-[44ch] text-[16.5px] leading-relaxed text-muted-foreground">
                  Generic prep throws random puzzles at you. MockMate reads your target job
                  description and asks the questions that role really tests — the systems,
                  the trade-offs, and the depth that hiring manager cares about.
                </p>
                <p className="mt-5 max-w-[44ch] text-[16.5px] leading-relaxed text-muted-foreground">
                  No LeetCode grind. Just the pressure you&apos;re about to face, rehearsed.
                </p>
              </div>

              {/* JD → questions panel */}
              <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className="rounded-xl border border-border bg-muted/50 p-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                    The job description
                  </p>
                  <p className="text-[13.5px] leading-[1.7] text-muted-foreground">
                    …own our{" "}
                    <mark className="bg-foreground/10 px-1 text-foreground">high-throughput event pipeline</mark>
                    , keep{" "}
                    <mark className="bg-foreground/10 px-1 text-foreground">p95 latency under 200ms</mark>
                    , and ship in{" "}
                    <mark className="bg-foreground/10 px-1 text-foreground">React + TypeScript</mark>
                    {" "}across the dashboard…
                  </p>
                </div>
                <div className="flex justify-center sm:flex-col">
                  <span className="font-mono text-lg text-faint">→</span>
                </div>
                <div className="rounded-xl border border-foreground bg-background p-5 shadow-sm">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Your tailored questions
                  </p>
                  <ul className="space-y-3 text-[13.5px] leading-snug">
                    <li className="flex gap-2.5">
                      <span className="mt-1 inline-block size-1.5 shrink-0 rotate-45 bg-foreground" />
                      How would you keep p95 under 200ms as the event pipeline scales 10×?
                    </li>
                    <li className="flex gap-2.5">
                      <span className="mt-1 inline-block size-1.5 shrink-0 rotate-45 bg-foreground" />
                      Walk me through backpressure handling when a downstream consumer stalls.
                    </li>
                    <li className="flex gap-2.5">
                      <span className="mt-1 inline-block size-1.5 shrink-0 rotate-45 bg-foreground" />
                      Where would you reach for TypeScript generics in the dashboard, and where
                      wouldn&apos;t you?
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SAMPLE REPORT ────────────────────────────────────── */}
        <section id="report" className="border-t border-border bg-muted/40">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <div className="reveal mx-auto max-w-2xl text-center">
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">The payoff</p>
              <h2 className="text-balance text-[34px] font-semibold leading-[1.08] tracking-[-0.025em] sm:text-[40px]">
                Feedback that reads like a hiring panel&apos;s notes.
              </h2>
            </div>

            <div className="reveal mx-auto mt-14 max-w-3xl overflow-hidden rounded-2xl border border-border bg-background shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_60px_-24px_rgba(0,0,0,0.18)]">
              <div className="border-b border-border px-8 py-10 text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Interview report</p>
                <p className="mt-1.5 text-[15px] font-medium tracking-[-0.01em]">Frontend Engineer · Spotify</p>
                <div className="mt-6 inline-flex items-center gap-2.5 whitespace-nowrap rounded-lg bg-primary px-6 py-3.5 text-primary-foreground">
                  <span className="inline-block size-3 shrink-0 rotate-45 border-[1.5px] border-primary-foreground" />
                  <span className="font-mono text-[22px] font-semibold tracking-[0.02em]">STRONG HIRE</span>
                </div>
                <div className="mt-5 flex items-center justify-center gap-2 whitespace-nowrap font-mono text-[13px] text-muted-foreground">
                  <span className="text-[15px] font-semibold text-foreground">4.7</span>
                  <span className="text-faint">/ 5 overall</span>
                </div>
                <p className="mx-auto mt-5 max-w-[52ch] text-[14.5px] leading-relaxed text-muted-foreground">
                  Strong systems-design instincts, explained trade-offs clearly under pressure,
                  and went deep on follow-ups without losing the thread. Exactly the depth this
                  bar calls for.
                </p>
              </div>
              <div className="divide-y divide-border">
                <ScoreRow label="Technical Accuracy" score={5} />
                <ScoreRow label="Communication Clarity" score={4} />
                <ScoreRow label="Problem-solving Approach" score={5} />
              </div>
              <div className="border-t border-border bg-muted/50 px-8 py-4 text-center">
                <p className="font-mono text-[11.5px] text-faint">
                  Sample report · Yours is generated from your own session
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING ──────────────────────────────────────────── */}
        <section id="pricing" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <div className="reveal mx-auto max-w-2xl text-center">
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">Pricing</p>
              <h2 className="text-balance text-[34px] font-semibold leading-[1.08] tracking-[-0.025em] sm:text-[40px]">
                Pay per session. No subscription.
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">
                Buy credits upfront. Use them when you need them. Stop when you&apos;re hired.
              </p>
            </div>

            <div className="reveal mx-auto mt-14 grid max-w-4xl gap-5 md:grid-cols-3">
              {/* Free */}
              <div className="flex flex-col rounded-xl border border-border bg-background p-7">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">Free</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-[40px] font-semibold tracking-[-0.03em]">0 DKK</span>
                </div>
                <p className="mt-2 text-[14px] text-muted-foreground">Try it first. No card required.</p>
                <ul className="mt-6 space-y-3 text-[14px] text-muted-foreground">
                  {["1 free session per week", "Full graded feedback report", "Up to 2 follow-ups per question", "Last 3 sessions in history"].map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <span className="mt-[7px] inline-block size-1.5 shrink-0 rotate-45 bg-foreground" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="mt-7 inline-flex h-10 items-center justify-center rounded-md border border-border bg-background text-sm font-medium transition-colors hover:bg-muted">
                  Start free
                </Link>
              </div>

              {/* Single session */}
              <div className="flex flex-col rounded-xl border border-border bg-background p-7">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">Single session</p>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-[40px] font-semibold tracking-[-0.03em]">25 DKK</span>
                  <span className="font-mono text-[13px] text-faint">~$3.50</span>
                </div>
                <p className="mt-2 text-[14px] text-muted-foreground">Before an interview. One credit.</p>
                <ul className="mt-6 space-y-3 text-[14px] text-muted-foreground">
                  {["1 interview session", "Full graded feedback report", "Up to 2 follow-ups per question", "Feedback report emailed to you"].map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <span className="mt-[7px] inline-block size-1.5 shrink-0 rotate-45 bg-foreground" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="mt-7 inline-flex h-10 items-center justify-center rounded-md border border-border bg-background text-sm font-medium transition-colors hover:bg-muted">
                  Buy a session
                </Link>
              </div>

              {/* 5-session pack */}
              <div className="relative flex flex-col rounded-xl border-2 border-foreground bg-background p-7 shadow-sm">
                <span className="absolute -top-3 left-7 whitespace-nowrap rounded-[5px] bg-primary px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-primary-foreground">
                  Best value
                </span>
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">5-session pack</p>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-[40px] font-semibold tracking-[-0.03em]">99 DKK</span>
                  <span className="font-mono text-[13px] text-faint">~$14</span>
                </div>
                <p className="mt-2 text-[14px] text-muted-foreground">During a job search. Save ~20%.</p>
                <ul className="mt-6 space-y-3 text-[14px] text-muted-foreground">
                  {["5 interview sessions", "Full graded feedback report", "Up to 2 follow-ups per question", "Feedback report emailed to you", "Full session history", "~20 DKK per session"].map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <span className="mt-[7px] inline-block size-1.5 shrink-0 rotate-45 bg-foreground" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="mt-7 inline-flex h-10 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90">
                  Buy 5 sessions
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────── */}
        <section id="faq" className="border-t border-border bg-muted/40">
          <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
            <div className="reveal mb-12 text-center">
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">FAQ</p>
              <h2 className="text-balance text-[34px] font-semibold leading-[1.08] tracking-[-0.025em] sm:text-[40px]">
                Questions, answered.
              </h2>
            </div>
            <div className="reveal divide-y divide-border border-y border-border">
              {faqs.map(({ q, a }) => (
                <details key={q} className="group py-5">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-[16px] font-medium">
                    {q}
                    <span className="faq-plus shrink-0 font-mono text-xl text-faint transition-transform duration-200">+</span>
                  </summary>
                  <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CLOSING CTA ──────────────────────────────────────── */}
        <section className="border-t border-border">
          <div className="reveal mx-auto max-w-3xl px-6 py-24 text-center md:py-32">
            <h2 className="text-balance text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[52px]">
              Don&apos;t freeze.<br />Rehearse.
            </h2>
            <p className="mx-auto mt-6 max-w-[42ch] text-[17px] leading-relaxed text-muted-foreground">
              Walk into the real interview having already answered the hard questions once.
              Your first session takes about fifteen minutes.
            </p>
            <div className="mt-9 flex justify-center">
              <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90">
                Start your first interview&nbsp;→
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-muted/40">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 py-12 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span className="inline-block size-4 rotate-45 border-[1.5px] border-foreground" />
            <span className="text-[17px] font-semibold tracking-[-0.02em]">MockMate</span>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <a href="#how" className="text-sm text-muted-foreground transition-colors hover:text-foreground">How it works</a>
            <a href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Pricing</a>
            <a href="#faq" className="text-sm text-muted-foreground transition-colors hover:text-foreground">FAQ</a>
            <Link href="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Sign in</Link>
          </div>
          <p className="font-mono text-[11.5px] text-faint">© 2026 MockMate</p>
        </div>
      </footer>
    </>
  )
}

function ScoreRow({ label, score }: { label: string; score: number }) {
  return (
    <div className="grid items-center gap-4 px-8 py-6 sm:grid-cols-[200px_1fr_auto]">
      <div className="text-[15px] font-medium">{label}</div>
      <div className="flex gap-1.5">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={`h-2 flex-1 rounded-full ${i < score ? "bg-foreground" : "bg-border"}`} />
        ))}
      </div>
      <div className="font-mono text-[14px] font-semibold">
        {score}<span className="font-normal text-faint">/5</span>
      </div>
    </div>
  )
}

const steps = [
  {
    n: 1,
    title: "Paste the job",
    body: "Drop in the job description you're targeting, plus your résumé as plain text. That's the entire setup.",
  },
  {
    n: 2,
    title: "Sit the interview",
    body: "A live AI interviewer asks five technical questions — and digs in with up to two follow-ups each, exactly like a real panel.",
  },
  {
    n: 3,
    title: "Read the verdict",
    body: "Get a graded scorecard across three dimensions and a clear Strong Hire / Hire / No Hire signal.",
  },
]

const faqs = [
  {
    q: "How long does an interview take?",
    a: "About fifteen minutes. Five technical questions, with up to two follow-ups each — enough to feel like the real thing without eating your evening.",
  },
  {
    q: "What kind of questions will I get?",
    a: "Questions are derived from the specific job description you paste — the systems, trade-offs, and technologies that role actually tests. Not a random LeetCode set.",
  },
  {
    q: "What is the hiring signal based on?",
    a: "Three dimensions, each scored 1–5: Technical Accuracy, Communication Clarity, and Problem-solving Approach. Together they roll up into a Strong Hire / Hire / No Hire signal.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. MockMate runs entirely in your browser. Paste your résumé and a job description, and you're in the interview.",
  },
  {
    q: "Can I retake an interview?",
    a: "Yes — run as many as your plan allows. Most people do a few rounds against the same role and watch their scores climb.",
  },
  {
    q: "Does it work for non-technical roles?",
    a: "MockMate is built for technical interviews today. If the job description is technical, it'll ask the right questions for it.",
  },
]
