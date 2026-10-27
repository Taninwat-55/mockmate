import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { auth } from "@/auth"
import { signInWithGoogle } from "@/actions/auth"
import { Logo } from "@/components/brand/Logo"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to MockMate with Google to start a graded AI mock interview.",
  alternates: { canonical: "/login" },
}

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Logo className="size-6" />
        <span className="text-xl font-semibold tracking-[-0.02em]">MockMate</span>
      </Link>

      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in to MockMate
          </h1>
          <p className="text-sm text-muted-foreground">
            Practice the interview for the job you want, then get graded feedback.
          </p>
        </div>
        <form action={signInWithGoogle}>
          <Button type="submit" size="lg" className="w-full">
            Continue with Google
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          One free interview every week. No card needed. We only use your name,
          email and profile photo from Google.
        </p>
      </div>

      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to home
      </Link>
    </main>
  )
}
