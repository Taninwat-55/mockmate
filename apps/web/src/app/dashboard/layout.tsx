import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { auth } from "@/auth"

// Auth-gated area — never index it.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

// Server-side auth guard for every /dashboard route. Database sessions can't be
// verified in Edge middleware, so protection lives here where Prisma is reachable.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return <>{children}</>
}
