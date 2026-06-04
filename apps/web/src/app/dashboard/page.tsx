import { auth } from "@/auth"
import { signOutAction } from "@/actions/auth"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const session = await auth()
  const user = session?.user

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user?.name ? `, ${user.name}` : ""}.
        </h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {user?.email}. The interview dashboard arrives in the next task.
        </p>
      </div>
      <form action={signOutAction}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </main>
  )
}
