/** @module Web environment validation schema using Zod */
import { z } from "zod";

const webEnvSchema = z.object({
	// Node
	NODE_ENV: z.enum(["development", "production", "test"]),
	ANALYZE: z.string().optional(),
	NEXT_RUNTIME: z.enum(["nodejs", "edge"]).optional(),

	// Public
	NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
	NEXT_PUBLIC_MARBLE_API_URL: z.url(),

	// Server
	DATABASE_URL: z
		.string()
		.refine(
			(url) => url.startsWith("postgres://") || url.startsWith("postgresql://"),
			"DATABASE_URL must be a postgres:// or postgresql:// URL",
		),

	BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
	UPSTASH_REDIS_REST_URL: z.url(),
	UPSTASH_REDIS_REST_TOKEN: z.string(),
	MARBLE_WORKSPACE_KEY: z.string(),
	FREESOUND_CLIENT_ID: z.string(),
	FREESOUND_API_KEY: z.string(),
	INTERNAL_API_KEY: z.string().min(16, "INTERNAL_API_KEY must be at least 16 characters"),
	DODO_API_KEY: z.string().optional(),
	DODO_WEBHOOK_SECRET: z.string().optional(),
	RESEND_API_KEY: z.string().optional(),
	LLM_PROVIDER: z.enum(["openai", "anthropic", "gemini"]).optional(),
	RUST_API_GATEWAY_URL: z.string().optional(),
	STORAGE_PROVIDER: z.enum(["local", "azure", "s3"]).optional(),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

export const webEnv = process.env.SKIP_ENV_VALIDATION
	? (process.env as unknown as WebEnv)
	: webEnvSchema.parse(process.env);
