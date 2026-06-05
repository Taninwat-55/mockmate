import { PostHog } from "posthog-node"

const globalForPostHog = globalThis as unknown as { posthog?: PostHog }

export const posthog =
  globalForPostHog.posthog ??
  new PostHog(process.env.POSTHOG_KEY!, {
    host: "https://eu.i.posthog.com",
  })

if (process.env.NODE_ENV !== "production") {
  globalForPostHog.posthog = posthog
}
