import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { prisma } from "@mockmate/db"
import { auth } from "@/auth"
import { getWeeklyUsage } from "@/lib/usage"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ProfileForm } from "@/components/settings/ProfileForm"
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog"

export default async function SettingsPage() {
  const session = await auth()
  // The layout guard guarantees a session; this satisfies the type narrowing.
  if (!session?.user?.id) notFound()

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      creditBalance: true,
      isOwner: true,
    },
  })
  if (!user) notFound()

  const usage = await getWeeklyUsage(session.user.id)

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-2xl space-y-8">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your profile and plan.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Your display name and account email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              name={user.name ?? ""}
              email={user.email}
              image={user.image}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>
              Your credits and weekly free session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {user.isOwner ? (
              <div>
                <p className="text-sm font-medium">Owner — unlimited Pro</p>
                <p className="text-sm text-muted-foreground">
                  Every interview runs on the Pro models. You&apos;re never
                  charged a credit or the weekly free session.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium tabular-nums">
                      {user.creditBalance}{" "}
                      {user.creditBalance === 1 ? "credit" : "credits"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      1 credit = 1 Pro interview. No subscription.
                    </p>
                  </div>
                  <Link href="/buy" className={buttonVariants()}>
                    Buy credits
                  </Link>
                </div>

                <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
              <p>
                <span className="font-medium tabular-nums">
                  {usage.used} of {usage.limit}
                </span>{" "}
                free {usage.limit === 1 ? "session" : "sessions"} used this week.
              </p>
              <p className="text-muted-foreground">
                {usage.resetsInDays === null
                  ? "Your weekly free session is available now."
                  : usage.resetsInDays === 0
                    ? "Resets later today."
                    : `Resets in ${usage.resetsInDays} ${
                        usage.resetsInDays === 1 ? "day" : "days"
                      }.`}
              </p>
            </div>

                <p className="text-xs text-muted-foreground">
                  Credits unlock the Pro models (sharper interviewer and grading),
                  the full feedback report by email, and full session history. A
                  single session is 19&nbsp;DKK, or a 5-session pack for
                  79&nbsp;DKK.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <CardDescription>
              Permanently delete your account and all interview data. This
              can&apos;t be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccountDialog />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
