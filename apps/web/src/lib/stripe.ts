import Stripe from "stripe"

// Lazily-constructed Stripe client. One-time payments only — no subscriptions
// (see docs/monetization.md). Constructing at module load would throw
// ("Neither apiKey nor config.authenticator provided") during any build where
// STRIPE_SECRET_KEY isn't present — e.g. CI — because Next evaluates the route
// modules to collect page data. Deferring construction to first use means the
// key is only required at request time, where it always exists.
let client: Stripe | null = null

export function getStripe(): Stripe {
  if (!client) {
    const apiKey = process.env.STRIPE_SECRET_KEY
    if (!apiKey) throw new Error("STRIPE_SECRET_KEY is not set")
    client = new Stripe(apiKey)
  }
  return client
}

// The two purchasable credit packs. Each maps to a Stripe Price ID and the
// number of credits granted when its payment completes. Defined once here so the
// checkout route and any pricing UI share a single source of truth.
export const CREDIT_PACKS = {
  single: { priceId: process.env.STRIPE_PRICE_SINGLE ?? "", credits: 1 },
  five: { priceId: process.env.STRIPE_PRICE_FIVE ?? "", credits: 5 },
} as const

export type CreditPack = keyof typeof CREDIT_PACKS
