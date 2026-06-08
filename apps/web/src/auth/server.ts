import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

console.log("[Auth] Creating auth instance...");
console.log("[Auth] DB:", typeof db);
console.log("[Auth] BETTER_AUTH_SECRET:", process.env.BETTER_AUTH_SECRET ? "set" : "missing");
console.log("[Auth] SITE_URL:", process.env.NEXT_PUBLIC_SITE_URL || "missing");

const authInstance = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", usePlural: true }),
  secret: process.env.BETTER_AUTH_SECRET || "lazynext-secret-min-32-chars-long-key-for-auth",
  emailAndPassword: { enabled: true },
  trustedOrigins: [process.env.NEXT_PUBLIC_SITE_URL || "https://lazynext.com"],
  baseURL: process.env.NEXT_PUBLIC_SITE_URL || "https://lazynext.com",
});

console.log("[Auth] Instance created. Type:", typeof authInstance);
console.log("[Auth] Has handler:", "handler" in (authInstance || {}));
console.log("[Auth] Keys:", Object.keys(authInstance || {}).slice(0, 5));

export const auth = authInstance;
export type Auth = typeof auth;
