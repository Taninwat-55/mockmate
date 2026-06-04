import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { signInWithGoogle } from "@/actions/auth"
import { Button } from "@/components/ui/button"

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in to MockMate
          </h1>
          <p className="text-sm text-muted-foreground">
            Practice realistic interviews and get graded feedback.
          </p>
        </div>
        <form action={signInWithGoogle}>
          <Button type="submit" size="lg" className="w-full">
            Continue with Google
          </Button>
        </form>
      </div>
    </main>
  )
}
