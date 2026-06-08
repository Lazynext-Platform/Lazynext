import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", usePlural: true, schema }),
  secret: process.env.BETTER_AUTH_SECRET || "lazynext-secret-key-for-auth-minimum-32-long",
  emailAndPassword: { 
    enabled: true,
    requireEmailVerification: false,
  },
  emailVerification: {
    sendVerificationEmail: async ({ url }: { url: string }) => {
      console.log("[Auth] Verification:", url);
    },
  },
  trustedOrigins: ["https://lazynext.com", "http://localhost:3000"],
  baseURL: process.env.NEXT_PUBLIC_SITE_URL || "https://lazynext.com",
});

export type Auth = typeof auth;
