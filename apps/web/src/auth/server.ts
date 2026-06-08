import { betterAuth } from "better-auth";
import { anonymous } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { webEnv } from "@/env/web";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  secret: webEnv.BETTER_AUTH_SECRET,
  plugins: [anonymous()],
  user: { deleteUser: { enabled: true } },
  emailAndPassword: { enabled: true },
  // Use in-memory rate limiting (no Redis dependency)
  rateLimit: {
    window: 60,
    max: 100,
  },
  baseURL: webEnv.NEXT_PUBLIC_SITE_URL,
  appName: "Lazynext",
  trustedOrigins: [webEnv.NEXT_PUBLIC_SITE_URL],
});

export type Auth = typeof auth;
