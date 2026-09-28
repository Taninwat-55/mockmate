# Monetization — Credit System & Stripe Integration

**Project:** MockMate  
**Phase:** 2 — Post-MVP  
**Author:** Taninwat Kaewpankan (Ice)  
**Last Updated:** 2026-09-27 (#52: every tier on 3.8 Flash, paid = deeper grading, owner Max tier, 100/day free cap, measured cost per session). Earlier: 2026-06-13 (tiered model matrix, 19/79 DKK, subscriptionStatus removed, credit refund on abandonment)  
**Status:** Planned — not yet implemented

---

## 1. Model Overview

MockMate uses a **pay-per-session credit model**. Users buy credits upfront; each interview session costs one credit. There are no subscriptions, no recurring charges, and no card required to try the product.

This model suits the job-seeker use case: users burst-use the product during an active job search and stop when they're hired. A monthly subscription would generate high churn and unnecessary friction. Credits don't.

**Every session gets the full interviewer; paying buys depth.** The free session is the product demo, so it runs the same live interviewer as paid (Gemini 3.8 Flash). Paid sessions get deeper grading, the emailed report and full history (see the model matrix in §2). Entitlement is `creditBalance` + the weekly free reset; there is no persistent "PRO" account state, which is why the old `subscriptionStatus` enum is being removed (see §5).

---

## 2. Pricing

| Tier | Price (DKK) | Price (USD approx.) | Credits | Perks |
|---|---|---|---|---|
| Free | 0 DKK | — | 1 / week | Full AI interviewer, web report only, last 3 sessions in history |
| Single session | 19 DKK | ~$2.70 | 1 | **Deeper grading** (see matrix) + email feedback report |
| 5-session pack | 79 DKK | ~$11 | 5 | **Deeper grading** + email feedback report, full session history |

**Free tier:** Users get 1 free session every 7 days, no card required. The cadence is long enough that it doesn't compete with the 25 DKK single session — active job seekers applying to multiple roles will want more than one session per week and will pay. Free users can see only their last 3 sessions in the dashboard history.

**Paid perks (both tiers):** After each paid session the full feedback report is emailed to the user via Resend (sent from the feedback route with `after()`; the AWS Lambda was removed in #54). Free users get the web report only.

**5-session pack only:** Full session history visible on the dashboard (no 3-session cap).

### Why these numbers

- 19 DKK (~$2.70) is "nothing" money — well under any hesitation threshold, which matters more than margin since the goal is adoption, not profit.
- 79 DKK for 5 = ~16 DKK per session (~$2.20), saving ~17% vs buying individually (79 vs 5×19 = 95 DKK).
- VAT: in Denmark, VAT registration is only required above 50,000 DKK/year revenue — below that the displayed price is effectively all yours (minus Stripe). Revisit once revenue approaches that threshold.
- Paid sessions cost more to serve (stronger models — see §8), but only paid sessions do, and 19 DKK still covers a paid session's AI cost many times over.

### Model matrix

Which Gemini model serves each step, by `InterviewSession.modelTier` (#52). The mapping lives in one place, `apps/web/src/lib/ai.ts`. Billing decides FREE vs PAID; only the owner can pick MAX (or FREE, to see what free users get).

| Step | FREE | PAID | MAX (owner only) |
|---|---|---|---|
| Live interview chat (streaming) | 3.8 Flash, light thinking | 3.8 Flash, light | 3.8 Flash, light |
| Weak-answer judge (follow-up decision) | 3.8 Flash, light | 3.8 Flash, light | 3.8 Flash, light |
| Hidden evaluation note (per question) | 3.8 Flash, light | 3.8 Flash, **deep** | **3.1 Pro Preview**, deep |
| Final grading matrix | 3.8 Flash, deep | 3.8 Flash, deep | **3.1 Pro Preview**, deep |

**Why 3.8 Flash everywhere.** A side-by-side test (#52, 25 scripted sessions: 5 configs × 5 candidates, real prompts) compared 2.5 Flash, 3.1 Flash-Lite, 3.5 Flash-Lite, 3.5 Flash + 2.5 Pro, and 3.8 Flash. All were reliable (0 JSON failures, 0 truncations). 3.8 Flash was the fastest (1.3s typical reply) and the most realistic interviewer (most follow-ups on vague answers). The Flash-Lite models are cheaper but lost track of the interview (one closed early and got stuck). The 2.5 models are access-restricted by Google and 3.5 Flash is legacy, so nothing new is built on them. MAX uses 3.1 Pro Preview (a preview model, owner only, about 25 requests/day on the current key ≈ 4 sessions/day).

**Daily free cap.** At most **100 free sessions per UTC day** across the whole site (`FREE_SESSIONS_PER_DAY` in `actions/interview.ts`). A spend guard against traffic spikes and free-session farming with many accounts. Checked before the weekly free is claimed, so a capped user keeps theirs. Paid and owner sessions never count.

---

## 3. Session Gating Logic

Before an interview session is created, the following check runs server-side (in the "start interview" Server Action):

```
if now() > user.freeSessionRefreshAt:
    → allow the session (free)
    → set user.freeSessionRefreshAt = now() + 7 days
    → create InterviewSession (isPaid: false)
    → proceed

else if user.creditBalance > 0:
    → deduct 1 credit (atomic DB transaction)
    → create InterviewSession (isPaid: true)
    → proceed

else:
    → block session creation
    → return error: INSUFFICIENT_CREDITS
    → redirect user to /buy
```

The credit deduction and `InterviewSession` creation must happen inside a **Prisma transaction** to prevent race conditions where two concurrent requests could both pass the balance check before either deducts.

`isPaid` on `InterviewSession` now drives three things: (1) whether the feedback report is emailed (free sessions skip it), (2) the dashboard history cap, and (3) the credit refund on abandonment. Model selection moved to its own column, `modelTier` (#52, §2 matrix): PAID for a credit session, FREE for the weekly free, the owner's pick for owner sessions. Both are set once at creation and never change.

### 3a. Credit refund on abandonment

If a **paid** session (`isPaid: true`) is auto-marked `ABANDONED` by the cleanup cron (IN_PROGRESS > 24h), the user is refunded **1 credit** (`creditBalance += 1`). A paid session the system pulled the plug on never costs the user money. This is a *credit* refund, not a Stripe money refund — automatic, no fees, no support tickets.

- The refund runs **inside the same transaction that flips the status to `ABANDONED`**. Because the cron only acts on rows still `IN_PROGRESS`, that status flip is itself the idempotency guard — a session cannot be refunded twice.
- This changes the cleanup cron from a bulk `updateMany` to a per-session pass for paid sessions (flip status + credit that user's balance). Free sessions can still be bulk-updated.
- **Scope:** refunds apply only to system-detected abandonment. Voluntarily ending a paid session early (`endInterviewEarly`) is **not** refunded — the user chose to stop and got their session.

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
creditBalance        Int       @default(0)
freeSessionRefreshAt DateTime  @default(now())  // epoch = eligible immediately on signup
```

### Removal: `subscriptionStatus`

Drop the `subscriptionStatus` field from `User` **and** the `SubscriptionStatus` enum (`FREE` / `PRO`) entirely. They modeled a recurring subscription, which this credit model does not use — a user's entitlement is `creditBalance` + the weekly free reset, never a persistent status. This is part of the same migration that adds the fields above. `entity-model.md` and `docs/prisma-schema.prisma` are updated to match when the migration lands.

### Addition to `InterviewSession` model

```prisma
isPaid  Boolean  @default(false)
```

Used to gate the post-session email, to enforce the history cap (free users see only their 3 most recent sessions on the dashboard; paid sessions are always visible), and to **select the AI model tier** (§2 matrix).

### New model: `CreditPurchase`

```prisma
model CreditPurchase {
  id               String   @id @default(cuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id])
  stripeSessionId  String   @unique
  creditsPurchased Int
  amountPaid       Int      // in øre — smallest currency unit (1900 = 19.00 DKK)
  currency         String   @default("dkk")
  createdAt        DateTime @default(now())
}
```

`amountPaid` stores the raw Stripe integer (2500 = 25.00 DKK). Display as `amount / 100` with the currency label. The `stripeSessionId` unique constraint prevents duplicate fulfillment if Stripe retries the webhook.

---

## 6. Settings — Billing Section

The billing UI lives in the existing **`/settings`** page (built in #30, currently a disabled stub), not a separate `/profile` route. It must show **credits, never a subscription** — there is no plan to manage.

### Credits section

- Credit balance — large and prominent
- "1 free session available" banner — shown only when the weekly free is eligible (`now() > freeSessionRefreshAt`); otherwise show the reset countdown ("next free session in 3 days")
- "Buy 1 session — 19 DKK" button
- "Buy 5 sessions — 79 DKK" button (shows the per-session saving)

### What you get when you pay (transparency)

Be explicit on this page (and on the landing pricing section) about exactly what a credit unlocks, so paying is never a surprise:

- **Deeper AI grading** — the per-question evaluation notes think harder (same live interviewer as free)
- The **full feedback report emailed** to you
- **Full session history** (free is capped at the last 3)

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

1. Schema migration — **remove** `subscriptionStatus` + the `SubscriptionStatus` enum; add `creditBalance`, `freeSessionRefreshAt` to `User`; add `isPaid` to `InterviewSession`; add `CreditPurchase` model
2. Create Stripe products and price IDs in the Stripe Dashboard (19 DKK single, 79 DKK 5-pack)
3. Add env vars to `.env.local` and Vercel project settings
4. `POST /api/stripe/checkout` — checkout session creation
5. `POST /api/stripe/webhook` — event handling and credit fulfillment
6. Session gating — update the "start interview" flow with the weekly free check + credit check (Prisma transaction); set `isPaid` on `InterviewSession`
6a. Dashboard history cap — query shows last 3 sessions for free users; all sessions for users with any paid history
7. **Per-session model selection** — route the live-chat / judge / eval-note / grading calls to the §2-matrix model for the session's tier (absorbs #38). Add the Pro-tier models alongside the existing `interviewModel` in `lib/ai.ts`; pick by `isPaid`
8. **Refund on abandonment** — update the abandon-sessions cron: for paid abandoned sessions, refund 1 credit in the same transaction as the status flip (§3a)
9. `/buy` + `/buy/success` pages — credit pack selection + post-payment confirmation
10. Email gating — update Lambda invocation to only fire when `session.isPaid == true`
11. **Settings billing section** (`/settings`) — credits, free-reset countdown, purchase history, transparency block (§6); no subscription wording
12. **Landing page pricing section** — update prices (29 / 115 DKK) and add the Pro-model perk to the paid tiers

---

## 8. Cost Sanity Check

Measured in the #52 test (full 5-question sessions, every follow-up and the grading included), 3.8 Flash at $0.75 / $3.75 per 1M tokens (in / out incl. thinking):

| Session | AI calls | Cost now | From 2027-01-01 ($1.50 / $7.50) |
|---|---|---|---|
| Strong candidate | 17 | ~0.13 DKK | ~0.26 DKK |
| Typical | 17 | ~0.16 DKK | ~0.33 DKK |
| Weak candidate (many follow-ups) | 27 | ~0.21 DKK | ~0.43 DKK |

A paid session thinks deeper on its notes, so it lands a little above these. Worst case is bounded by the per-session call budget (50, `lib/ai-guard.ts`) and per-call token caps (`outputLimits()`): about 10 DKK, not reachable in honest use. The real exposure is volume, which the 100/day free cap bounds at roughly 43 DKK/day. One credit sale (19 DKK minus Stripe fees) pays for about 45 free sessions. Also set a monthly spend cap with an alert in Google AI Studio.

At low scale (100 sessions/month, mixed free/paid):

| Item | Cost |
|---|---|
| Gemini — mixed free/paid models | ~$1–3 |
| Vercel Hobby | $0 |
| Neon free tier | $0 |
| Domain | ~$1.25 |
| **Total** | **~$2–4/month** |

Revenue from 10 paying users (single sessions): 10 × 19 DKK = **190 DKK (~$27)**

Even if 90% of users never pay, the model sustains itself with a handful of paying users per month.
