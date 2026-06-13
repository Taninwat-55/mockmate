import Stripe from "stripe"

// Single Stripe client for the app. One-time payments only — no subscriptions
// (see docs/monetization.md). The secret key is read from the environment;
// API calls fail at runtime if it's missing, which is the desired behaviour in
// any environment where billing is actually exercised.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "")

// The two purchasable credit packs. Each maps to a Stripe Price ID and the
// number of credits granted when its payment completes. Defined once here so the
// checkout route and any pricing UI share a single source of truth.
export const CREDIT_PACKS = {
  single: { priceId: process.env.STRIPE_PRICE_SINGLE ?? "", credits: 1 },
  five: { priceId: process.env.STRIPE_PRICE_FIVE ?? "", credits: 5 },
} as const

export type CreditPack = keyof typeof CREDIT_PACKS
