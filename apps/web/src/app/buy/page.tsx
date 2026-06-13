import Link from "next/link"
import { ArrowLeft, Check } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { BuyButton } from "@/components/billing/BuyButton"

const PACK_PERKS = [
  "Pro interviewer + grading models",
  "Full feedback report by email",
  "Full session history",
]

export default function BuyPage() {
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
          <h1 className="mt-4 text-xl font-semibold tracking-tight">
            Buy credits
          </h1>
          <p className="text-sm text-muted-foreground">
            One credit = one Pro interview. No subscription — you only pay for
            what you use.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Single session</CardTitle>
              <CardDescription>
                <span className="text-2xl font-semibold text-foreground">
                  19 DKK
                </span>{" "}
                · 1 credit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {PACK_PERKS.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 text-foreground" />
                    {perk}
                  </li>
                ))}
              </ul>
              <BuyButton pack="single">Buy 1 session — 19 DKK</BuyButton>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5-session pack</CardTitle>
              <CardDescription>
                <span className="text-2xl font-semibold text-foreground">
                  79 DKK
                </span>{" "}
                · 5 credits · save ~17%
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 text-foreground" />~16 DKK per
                  session
                </li>
                {PACK_PERKS.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 text-foreground" />
                    {perk}
                  </li>
                ))}
              </ul>
              <BuyButton pack="five">Buy 5 sessions — 79 DKK</BuyButton>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground">
          Secure payment via Stripe. Free users get 1 interview every 7 days on
          the base model — credits unlock the Pro experience.
        </p>
      </div>
    </main>
  )
}
