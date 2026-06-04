import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@mockmate/db"

// NextAuth v5 config. Sessions are stored in Postgres via the Prisma adapter
// (database strategy), so route protection happens server-side — not in Edge
// middleware, which can't reach Prisma.
//
// We read our documented env names (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET /
// NEXTAUTH_SECRET) explicitly rather than NextAuth's AUTH_* defaults, keeping
// .env.local as the single source of truth.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "database" },
  pages: { signIn: "/login" },
})
