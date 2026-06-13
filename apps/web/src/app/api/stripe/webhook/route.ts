import { NextResponse } from "next/server"
import type Stripe from "stripe"

import { prisma } from "@mockmate/db"
import { getStripe } from "@/lib/stripe"

export const runtime = "nodejs"

// Stripe → server. Verifies the signature against the raw request body, then
// fulfils credit grants on `checkout.session.completed`.
//
// Fulfilment is idempotent: the CreditPurchase.stripeSessionId unique constraint
// absorbs Stripe's at-least-once webhook retries, so a duplicate delivery throws
// P2002 and is swallowed rather than double-crediting the user. The purchase row
// and the balance increment run in one transaction — either both happen or
// neither does.
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature")
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !secret) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 })
  }

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret)
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const checkout = event.data.object as Stripe.Checkout.Session
    const userId = checkout.metadata?.userId
    const credits = Number(checkout.metadata?.creditsToAdd ?? 0)

    if (userId && credits > 0) {
      try {
        await prisma.$transaction([
          prisma.creditPurchase.create({
            data: {
              userId,
              stripeSessionId: checkout.id,
              creditsPurchased: credits,
              amountPaid: checkout.amount_total ?? 0,
              currency: checkout.currency ?? "dkk",
            },
          }),
          prisma.user.update({
            where: { id: userId },
            data: { creditBalance: { increment: credits } },
          }),
        ])
      } catch (err) {
        // P2002 = this checkout was already fulfilled by an earlier delivery.
        // Swallow it and ack so Stripe stops retrying; rethrow anything else as
        // a 500 so Stripe does retry a genuinely failed fulfilment.
        if ((err as { code?: string }).code !== "P2002") {
          return NextResponse.json(
            { error: "Fulfilment failed." },
            { status: 500 },
          )
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
