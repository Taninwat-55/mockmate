import { prisma } from "@mockmate/db"
import { auth } from "@/auth"
import { NewInterviewForm } from "@/components/interview/NewInterviewForm"
import { ResumeBanner } from "@/components/dashboard/ResumeBanner"
import { SessionHistory } from "@/components/dashboard/SessionHistory"
import { UserMenu } from "@/components/dashboard/UserMenu"

export default async function DashboardPage() {
  const session = await auth()
  const user = session?.user

  // Pre-fill the resume textarea from the user's last uploaded CV, and read the
  // billing entitlement so the form can offer free vs. credit (#16).
  const userRecord = user?.id
    ? await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          savedResume: true,
          creditBalance: true,
          freeSessionRefreshAt: true,
        },
      })
    : null
  const savedResume = userRecord?.savedResume ?? undefined
  const credits = userRecord?.creditBalance ?? 0
  const freeAvailable = userRecord
    ? new Date() >= userRecord.freeSessionRefreshAt
    : false

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
        <UserMenu
          name={user?.name ?? null}
          email={user?.email ?? null}
          image={user?.image ?? null}
        />
      </header>

      {user?.id && (
        <div className="mt-10 w-full max-w-2xl">
          <ResumeBanner userId={user.id} />
        </div>
      )}

      <div className="mt-6 w-full max-w-2xl">
        <NewInterviewForm
          savedResume={savedResume}
          credits={credits}
          freeAvailable={freeAvailable}
        />
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
