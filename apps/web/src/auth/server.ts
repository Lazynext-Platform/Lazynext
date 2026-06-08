import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", usePlural: true }),
  secret: process.env.BETTER_AUTH_SECRET || "lazynext-secret-min-32-chars-long-key",
  emailAndPassword: { enabled: true },
  trustedOrigins: [process.env.NEXT_PUBLIC_SITE_URL || "https://lazynext.com"],
  baseURL: process.env.NEXT_PUBLIC_SITE_URL || "https://lazynext.com",
});

export type Auth = typeof auth;
