import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/auth"
import { CREDIT_PACKS, getStripe } from "@/lib/stripe"
import { limitUser, tooManyRequests } from "@/lib/rate-limit"

export const runtime = "nodejs"

const bodySchema = z.object({ pack: z.enum(["single", "five"]) })

const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000"

// Creates a one-time Stripe Checkout Session for a credit pack and returns its
// hosted URL. The browser redirects to `url`; the credits are granted later in
// the webhook (POST /api/stripe/webhook) on `checkout.session.completed` — never
// here, because a created session is not yet a paid one.
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You need to be signed in." },
      { status: 401 },
    )
  }

  const limit = await limitUser("checkout", session.user.id)
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds)

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Unknown credit pack." }, { status: 400 })
  }

  const { priceId, credits } = CREDIT_PACKS[parsed.data.pack]
  if (!priceId) {
    return NextResponse.json(
      { error: "Pricing is not configured." },
      { status: 500 },
    )
  }

  try {
    const checkout = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/buy/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/buy`,
      client_reference_id: session.user.id,
      // Read back in the webhook to fulfil the right user and credit amount.
      metadata: { userId: session.user.id, creditsToAdd: String(credits) },
    })
    return NextResponse.json({ url: checkout.url })
  } catch {
    return NextResponse.json(
      { error: "Couldn't start checkout. Please try again." },
      { status: 500 },
    )
  }
}
