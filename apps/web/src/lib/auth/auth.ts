import { betterAuth } from "better-auth";

// Basic authentication wrapper for Lazynext 2025
// This can be expanded to include OAuth providers (Google, GitHub)
export const auth = betterAuth({
  database: {
    // In a full implementation, this uses a Kysely dialect (e.g. Postgres)
    provider: "sqlite",
    url: ":memory:", 
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    // Example: github: { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET }
  }
});
