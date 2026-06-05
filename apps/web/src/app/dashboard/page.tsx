import { auth } from "@/auth"
import { signOutAction } from "@/actions/auth"
import { NewInterviewForm } from "@/components/interview/NewInterviewForm"
import { ResumeBanner } from "@/components/dashboard/ResumeBanner"
import { SessionHistory } from "@/components/dashboard/SessionHistory"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const session = await auth()
  const user = session?.user

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <header className="flex w-full max-w-2xl items-center justify-between gap-4">
        <div className="text-left">
          <h1 className="text-xl font-semibold tracking-tight">
            Welcome{user?.name ? `, ${user.name}` : ""}.
          </h1>
          <p className="text-sm text-muted-foreground">
            Paste a resume and a job description to start a mock interview.
          </p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </header>

      {user?.id && (
        <div className="mt-10 w-full max-w-2xl">
          <ResumeBanner userId={user.id} />
        </div>
      )}

      <div className="mt-6 w-full max-w-2xl">
        <NewInterviewForm />
      </div>

      {user?.id && (
        <div className="mt-10 w-full max-w-2xl">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Past interviews
          </h2>
          <SessionHistory userId={user.id} />
        </div>
      )}
    </main>
  )
}
