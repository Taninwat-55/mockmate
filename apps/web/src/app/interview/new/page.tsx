import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { prisma } from "@mockmate/db"
import { auth } from "@/auth"
import { AppHeader } from "@/components/layout/AppHeader"
import { NewInterviewForm } from "@/components/interview/NewInterviewForm"

// The interview setup form on its own page (#87), so the dashboard can be about
// your interviews instead of one long form.
export default async function NewInterviewPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  // Pre-fill the resume from the user's last uploaded CV, and read the billing
  // entitlement so the form can offer free vs. credit (#16).
  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      savedResume: true,
      creditBalance: true,
      freeSessionRefreshAt: true,
      isOwner: true,
    },
  })

  return (
    <>
      <AppHeader user={session.user} />
      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-2xl">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">New interview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a role and start. Your CV and the job posting are optional and make the
            questions sharper.
          </p>
        </div>

        <div className="mt-8 w-full max-w-2xl">
          <NewInterviewForm
            savedResume={userRecord?.savedResume ?? undefined}
            credits={userRecord?.creditBalance ?? 0}
            freeAvailable={userRecord ? new Date() >= userRecord.freeSessionRefreshAt : false}
            isOwner={userRecord?.isOwner ?? false}
          />
        </div>
      </main>
    </>
  )
}
