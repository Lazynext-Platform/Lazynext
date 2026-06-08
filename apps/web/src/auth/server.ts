import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

function createAuth() {
  try {
    return betterAuth({
      database: drizzleAdapter(db, { provider: "pg", usePlural: true }),
      secret: process.env.BETTER_AUTH_SECRET || "lazynext-secret-min-32-chars-long-key-x",
      emailAndPassword: { enabled: true, requireEmailVerification: false },
      emailVerification: { sendVerificationEmail: async ({ user, url }: { user: { email: string }, url: string }) => { console.log("[Auth] Verify:", user.email, url); } },
      trustedOrigins: [process.env.NEXT_PUBLIC_SITE_URL || "https://lazynext.com"],
      baseURL: process.env.NEXT_PUBLIC_SITE_URL || "https://lazynext.com",
    });
  } catch (e) {
    console.error("[Auth] Init failed:", e);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { handler: async () => new Response(JSON.stringify({ error: "Auth init: " + String(e) }), { status: 500, headers: { "Content-Type": "application/json" } }) } as any;
  }
}

export const auth = createAuth() as ReturnType<typeof betterAuth>;
export type Auth = typeof auth;
