import Link from "next/link"

import { auth } from "@/auth"
import { buttonVariants } from "@/components/ui/button"

export default async function Home() {
  const session = await auth()

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          MockMate
        </h1>
        <p className="mx-auto max-w-md text-lg text-muted-foreground">
          A realistic AI mock interviewer. Paste a job description and your
          resume, get interrogated, and receive graded feedback.
        </p>
      </div>
      <Link
        href={session ? "/dashboard" : "/login"}
        className={buttonVariants({ size: "lg" })}
      >
        {session ? "Go to dashboard" : "Sign in to start"}
      </Link>
    </main>
  )
}
