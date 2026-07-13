/** @module Web environment validation schema using Zod */
import { z } from "zod";

const webEnvSchema = z.object({
	// Node
	NODE_ENV: z.enum(["development", "production", "test"]),
	ANALYZE: z.string().optional(),
	NEXT_RUNTIME: z.enum(["nodejs", "edge"]).optional(),

	// Public
	NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
	NEXT_PUBLIC_MARBLE_API_URL: z.url().optional(),

	// Server
	DATABASE_URL: z
		.string()
		.refine(
			(url) => url.startsWith("postgres://") || url.startsWith("postgresql://"),
			"DATABASE_URL must be a postgres:// or postgresql:// URL",
		),

	BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
	UPSTASH_REDIS_REST_URL: z.url().optional(),
	UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
	MARBLE_WORKSPACE_KEY: z.string().optional(),
	FREESOUND_CLIENT_ID: z.string().optional(),
	FREESOUND_API_KEY: z.string().optional(),
	INTERNAL_API_KEY: z.string().optional(),
	DODO_API_KEY: z.string().optional(),
	DODO_WEBHOOK_SECRET: z.string().optional(),
	RESEND_API_KEY: z.string().optional(),
	LLM_PROVIDER: z.enum(["gemini"]).optional(),
	RUST_API_GATEWAY_URL: z.string().optional(),
	STORAGE_PROVIDER: z.enum(["local", "azure", "s3"]).optional(),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

/**
 * Validate the web environment.
 *
 * - `SKIP_ENV_VALIDATION` bypasses validation entirely (used during builds).
 * - In production, invalid/missing required config throws (fail-fast) so a
 *   misconfigured deploy is caught immediately.
 * - In development/test, validation failures are logged as a warning and the
 *   raw `process.env` is used, so a missing optional/local var can't crash
 *   unrelated modules the moment they import `webEnv`.
 */
function loadWebEnv(): WebEnv {
	if (process.env.SKIP_ENV_VALIDATION) {
		return process.env as unknown as WebEnv;
	}

	const parsed = webEnvSchema.safeParse(process.env);
	if (parsed.success) {
		return parsed.data;
	}

	const issues = parsed.error.issues
		.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
		.join("; ");

	if (process.env.NODE_ENV === "production") {
		throw new Error(`Invalid web environment configuration: ${issues}`);
	}

	console.warn(
		`⚠️  Web env validation failed (continuing in ${
			process.env.NODE_ENV ?? "unknown"
		} mode without hard-crash): ${issues}`,
	);
	return process.env as unknown as WebEnv;
}

export const webEnv: WebEnv = loadWebEnv();
