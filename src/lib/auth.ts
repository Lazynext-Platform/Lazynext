import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg", // Postgres
    }),
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID || "MOCK_GITHUB_ID",
            clientSecret: process.env.GITHUB_CLIENT_SECRET || "MOCK_GITHUB_SECRET",
        }
    }
});
