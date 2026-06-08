import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", usePlural: true }),
  secret: process.env.BETTER_AUTH_SECRET || "lazynext-secret-min-32-chars-long-key-for-auth",
  emailAndPassword: { 
    enabled: true,
    // Disable email verification for now (no email provider configured)
    requireEmailVerification: false,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      console.log("[Auth] Verification email URL for", user.email, ":", url);
      // No email provider — log the URL instead
    },
  },
  trustedOrigins: [process.env.NEXT_PUBLIC_SITE_URL || "https://lazynext.com"],
  baseURL: process.env.NEXT_PUBLIC_SITE_URL || "https://lazynext.com",
});

export type Auth = typeof auth;
