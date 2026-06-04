import { type DefaultSession } from "next-auth"

// Augment NextAuth's Session so `session.user.id` is typed. The id is populated
// in the session callback (apps/web/src/auth.ts).
declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}
