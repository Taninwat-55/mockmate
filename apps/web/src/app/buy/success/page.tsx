import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

// Landing page after a completed Stripe Checkout. Credits are granted by the
// webhook (asynchronously), so this page reassures rather than reads the balance
// — by the time the user clicks through to the dashboard it has settled.
export default function BuySuccessPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md space-y-4 text-center">
        <CheckCircle2 className="mx-auto size-10 text-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">
          Payment successful
        </h1>
        <p className="text-sm text-muted-foreground">
          Your credits are being added to your account — this usually takes a few
          seconds. Start a Pro interview whenever you&apos;re ready.
        </p>
        <Link href="/dashboard" className={buttonVariants()}>
          Go to dashboard
        </Link>
      </div>
    </main>
  )
}
