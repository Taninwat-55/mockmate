import type { Metadata } from "next"
import Link from "next/link"

import { Logo } from "@/components/brand/Logo"

export const metadata: Metadata = {
  title: "About",
  description:
    "MockMate is an AI-powered mock-interview tool that runs a realistic technical interview tailored to the job you're targeting, then grades you like a hiring panel.",
  alternates: { canonical: "/about" },
}

export default function AboutPage() {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="size-5" />
            <span className="text-[19px] font-semibold tracking-[-0.02em]">MockMate</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            Start free
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
          About
        </p>
        <h1 className="text-balance text-[40px] font-semibold leading-[1.04] tracking-[-0.03em] sm:text-[52px]">
          What is MockMate?
        </h1>
        <p className="mt-7 text-[18px] leading-relaxed text-muted-foreground">
          MockMate is an AI-powered mock-interview tool that runs a realistic, multi-turn
          technical interview tailored to a specific job description, then returns graded
          feedback like a hiring panel would. It exists to fix a common problem: most people
          fail technical interviews not because they lack the knowledge, but because they
          freeze under pressure. Reading prep lists and watching walkthroughs doesn&apos;t
          simulate being put on the spot. MockMate does.
        </p>

        {/* How it works */}
        <section className="mt-16">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em]">How it works</h2>
          <ol className="mt-6 space-y-5">
            <li className="flex gap-4">
              <span className="mt-0.5 inline-grid size-7 shrink-0 place-items-center rounded-full border-[1.6px] border-foreground font-mono text-[12px] font-medium">
                1
              </span>
              <p className="text-[16.5px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Paste the job and your résumé.</span>{" "}
                You drop in the job description you&apos;re targeting and your résumé as plain
                text. That&apos;s the entire setup — both become the AI&apos;s context for the
                session.
              </p>
            </li>
            <li className="flex gap-4">
              <span className="mt-0.5 inline-grid size-7 shrink-0 place-items-center rounded-full border-[1.6px] border-foreground font-mono text-[12px] font-medium">
                2
              </span>
              <p className="text-[16.5px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Sit the interview.</span>{" "}
                An AI interviewer asks five technical questions derived from that role — and
                digs in with up to two follow-ups each, challenging vague or incomplete
                answers exactly like a real panel.
              </p>
            </li>
            <li className="flex gap-4">
              <span className="mt-0.5 inline-grid size-7 shrink-0 place-items-center rounded-full border-[1.6px] border-foreground font-mono text-[12px] font-medium">
                3
              </span>
              <p className="text-[16.5px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Read the verdict.</span>{" "}
                At the end you get a graded scorecard across Technical Accuracy,
                Communication Clarity, and Problem-solving Approach — each scored 1–5 — plus a
                clear Strong&nbsp;Hire / Hire / No&nbsp;Hire signal and a short summary.
              </p>
            </li>
          </ol>
        </section>

        {/* Who it's for */}
        <section className="mt-16">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em]">Who it&apos;s for</h2>
          <p className="mt-6 text-[16.5px] leading-relaxed text-muted-foreground">
            MockMate is built for developers and career changers — typically junior to
            mid-level — preparing for a technical interview at a company they actually want to
            work at. Because it&apos;s text-first, it also lowers the barrier for non-native
            English speakers, who can read and compose answers carefully while still building
            the skill of explaining technical ideas clearly under pressure.
          </p>
        </section>

        {/* Pricing */}
        <section className="mt-16">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em]">What it costs</h2>
          <p className="mt-6 text-[16.5px] leading-relaxed text-muted-foreground">
            MockMate is pay-per-session, with no subscription. There&apos;s a free session
            every week, a single session for 25&nbsp;DKK, or a 5-session pack for 99&nbsp;DKK.
            It runs entirely in your browser — there&apos;s nothing to install.
          </p>
        </section>

        <div className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-border pt-10">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            Start your first interview&nbsp;→
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Back to home
          </Link>
        </div>
      </main>

      <footer className="border-t border-border bg-muted/40">
        <div className="mx-auto flex max-w-3xl flex-col items-start justify-between gap-6 px-6 py-12 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <Logo className="size-[18px]" />
            <span className="text-[17px] font-semibold tracking-[-0.02em]">MockMate</span>
          </div>
          <p className="font-mono text-[11.5px] text-faint">© 2026 MockMate</p>
        </div>
      </footer>
    </>
  )
}
