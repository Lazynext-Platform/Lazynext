import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_mock_key");

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", usePlural: true, schema }),
  secret: process.env.BETTER_AUTH_SECRET || "lazynext-secret-key-for-auth-minimum-32-long",
  emailAndPassword: { 
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }: { user: any, url: string }) => {
      console.log(`[Auth] Sending verification email to ${user.email}:`, url);
      try {
        await resend.emails.send({
          from: "Lazynext Auth <noreply@lazynext.com>",
          to: user.email,
          subject: "Verify your email address",
          html: `<p>Click the link below to verify your email address:</p><p><a href="${url}">${url}</a></p>`,
        });
      } catch (error) {
        console.error("Failed to send verification email:", error);
      }
    },
  },
  trustedOrigins: ["https://lazynext.com", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
  baseURL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
});

export type Auth = typeof auth;
