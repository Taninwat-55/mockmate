# Monetization — Credit System & Stripe Integration

**Project:** MockMate  
**Phase:** 2 — Post-MVP  
**Author:** Taninwat Kaewpankan (Ice)  
**Last Updated:** 2026-06-05  
**Status:** Planned — not yet implemented

---

## 1. Model Overview

MockMate uses a **pay-per-session credit model**. Users buy credits upfront; each interview session costs one credit. There are no subscriptions, no recurring charges, and no card required to try the product.

This model suits the job-seeker use case: users burst-use the product during an active job search and stop when they're hired. A monthly subscription would generate high churn and unnecessary friction. Credits don't.

---

## 2. Pricing

| Pack | Price (DKK) | Price (USD approx.) | Credits |
|---|---|---|---|
| Single session | 25 DKK | ~$3.50 | 1 |
| 5-session pack | 99 DKK | ~$14 | 5 |

**Free session:** Every new user gets 1 free session, no card required. This is the primary conversion hook — users experience the full product before committing any money. No card friction, no trial period countdown.

### Why these numbers

- 25 DKK is below the "coffee" psychological threshold. Nobody thinks twice.
- 99 DKK for 5 saves the user ~20% per session and gives MockMate a larger upfront payment.
- Both prices comfortably cover infrastructure costs even at very low user volume. 10 paying users buying single sessions covers Vercel + Neon + domain for the month.

---

## 3. Session Gating Logic

Before an interview session is created, the following check runs server-side (in the "start interview" Server Action):

```
if user.freeSessionUsed == false:
    → allow the session
    → set user.freeSessionUsed = true
    → create InterviewSession
    → proceed

else if user.creditBalance > 0:
    → deduct 1 credit (atomic DB transaction)
    → create InterviewSession
    → proceed

else:
    → block session creation
    → return error: INSUFFICIENT_CREDITS
    → redirect user to /buy
```

The credit deduction and `InterviewSession` creation must happen inside a **Prisma transaction** to prevent race conditions where two concurrent requests could both pass the balance check before either deducts.

---

## 4. Stripe Integration

### Products to create in Stripe Dashboard

- **Single session** — one-time payment, 25.00 DKK
- **5-session pack** — one-time payment, 99.00 DKK

### Purchase flow

```
User clicks "Buy credits" on /buy page
  → POST /api/stripe/checkout { pack: "single" | "five" }
      creates Stripe Checkout Session:
        mode: "payment"
        line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }]
        success_url: /buy/success?session_id={CHECKOUT_SESSION_ID}
        cancel_url: /buy
        metadata: { userId, creditsToAdd }
      returns { url }
  → browser redirects to Stripe hosted checkout page
  → user completes payment
  → Stripe fires webhook: checkout.session.completed
  → POST /api/stripe/webhook (Stripe → Next.js)
      verifies Stripe signature
      reads metadata.userId + metadata.creditsToAdd
      creates CreditPurchase record in DB
      increments user.creditBalance by creditsToAdd
      returns 200
  → user lands on /buy/success
```

### API routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `POST /api/stripe/checkout` | POST | Required (session) | Creates Stripe Checkout Session, returns redirect URL |
| `POST /api/stripe/webhook` | POST | Stripe signature | Receives Stripe events, fulfills credit grants |

The webhook route **must** be an API Route, not a Server Action. It needs raw body access for Stripe signature verification (`stripe.webhooks.constructEvent`), and it is called by Stripe's servers — not the browser. Disable Next.js body parsing on this route.

### Environment variables to add

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_SINGLE=          # Stripe Price ID for 25 DKK single session
STRIPE_PRICE_FIVE=            # Stripe Price ID for 99 DKK 5-session pack
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## 5. Database Changes

### Additions to `User` model

```prisma
creditBalance    Int     @default(0)
freeSessionUsed  Boolean @default(false)
```

### New model: `CreditPurchase`

```prisma
model CreditPurchase {
  id               String   @id @default(cuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id])
  stripeSessionId  String   @unique
  creditsPurchased Int
  amountPaid       Int      // in øre — smallest currency unit (2500 = 25.00 DKK)
  currency         String   @default("dkk")
  createdAt        DateTime @default(now())
}
```

`amountPaid` stores the raw Stripe integer (2500 = 25.00 DKK). Display as `amount / 100` with the currency label. The `stripeSessionId` unique constraint prevents duplicate fulfillment if Stripe retries the webhook.

---

## 6. Profile & Billing Page

Route: `/profile`

### Credits section (top)

- Credit balance — large and prominent
- "1 free session available" banner — shown only if `freeSessionUsed = false`
- "Buy 1 session — 25 DKK" button
- "Buy 5 sessions — 99 DKK" button (shows the per-session saving)

### Session history

- Past interview sessions: date, status, score if available
- Link to full feedback for each completed session

### Purchase history

- Each `CreditPurchase` row: date, pack bought, amount paid
- Empty state: "No purchases yet"

No Stripe Customer Portal needed — there are no subscriptions to manage. This simple page is the complete billing UI.

---

## 7. Implementation Order

When this feature is picked up, implement in this order:

1. Schema migration — add `creditBalance`, `freeSessionUsed` to `User`; add `CreditPurchase` model
2. Create Stripe products and price IDs in the Stripe Dashboard
3. Add env vars to `.env.local` and Vercel project settings
4. `POST /api/stripe/checkout` — checkout session creation
5. `POST /api/stripe/webhook` — event handling and credit fulfillment
6. Session gating — update the "start interview" flow with the credit check (Prisma transaction)
7. `/buy` page — credit pack selection UI
8. `/buy/success` page — confirmation screen after payment
9. `/profile` page — credits, session history, purchase history

---

## 8. Cost Sanity Check

At low scale (100 sessions/month, all paid):

| Item | Cost |
|---|---|
| Gemini Flash (~$0.004/session) | ~$0.40 |
| Vercel Hobby | $0 |
| Neon free tier | $0 |
| Domain | ~$1.25 |
| **Total** | **~$1.65/month** |

Revenue from 10 paying users (single sessions): 10 × 25 DKK = **250 DKK (~$35)**

Even if 90% of users never pay, the model sustains itself with a handful of paying users per month.
