/**
 * Centralized Zod validation schemas for all API inputs and form submissions.
 *
 * Every API route handler and form submission should use these schemas
 * to validate inbound data before processing. This ensures consistent
 * error messages, type safety, and prevents injection/overflow attacks.
 *
 * @module lib/validation
 */

import { z } from "zod";

// ── Shared field definitions ──────────────────────────────────────────────

const promptField = z
	.string()
	.min(1, "Prompt must not be empty")
	.max(50000, "Prompt exceeds 50,000 character maximum")
	.trim();

const nonEmptyString = (name: string, maxLength = 500) =>
	z
		.string()
		.min(1, `${name} must not be empty`)
		.max(maxLength, `${name} exceeds maximum length of ${maxLength}`)
		.trim();

// ── API Request Schemas ───────────────────────────────────────────────────

/** POST /api/chat */
export const chatSchema = z.object({
	prompt: promptField,
});

/** POST /api/ai/generate */
export const aiGenerateSchema = z.object({
	prompt: promptField,
	type: z
		.enum(["video", "audio", "music"])
		.default("video"),
});

/** POST /api/ai/autonomous-edit */
export const autonomousEditSchema = z.object({
	prompt: promptField,
	require_plan_approval: z.boolean().default(false),
	source_files: z.array(z.string().max(4096)).max(100).optional(),
});

/** POST /api/export */
export const exportSchema = z.object({
	projectId: z.string().min(1, "projectId must not be empty"),
	format: z
		.enum(["mp4", "webm", "mov", "aaf", "fcpxml", "dcp"])
		.default("mp4"),
	bitrate_kbps: z.number().int().positive().default(8000),
});

/** POST /api/dodo/checkout */
export const dodoCheckoutSchema = z.object({
	priceId: z.string().min(1, "priceId must not be empty"),
	code: z.string().optional(),
});

/** PATCH /api/user/profile */
export const updateProfileSchema = z.object({
	name: nonEmptyString("Name", 200),
});

/** POST /api/projects */
export const createProjectSchema = z.object({
	name: nonEmptyString("Project name", 200),
});

// ── Media / AI Schemas ────────────────────────────────────────────────────

/** POST /api/ai/nerf */
export const nerfSchema = z.object({
	videoId: z.string().min(1),
});

/** POST /api/ai/dub */
export const dubSchema = z.object({
	clipId: z.string().min(1),
	targetLanguage: z.string().min(1).max(50),
});

/** POST /api/ai/subtitles */
export const subtitlesSchema = z.object({
	videoId: z.string().min(1),
});

/** POST /api/ai/tts */
export const ttsSchema = z.object({
	text: z.string().min(1).max(5000),
	voiceId: z.string().default("default_voice"),
});

/** POST /api/ai/diffusion */
export const diffusionSchema = z.object({
	prompt: promptField,
});

// ── Social Publish Schemas ────────────────────────────────────────────────

export const socialPublishSchema = z.object({
	video_path: z.string().min(1),
	platform: z.enum(["tiktok", "youtube", "instagram", "twitter"]),
	title: z.string().max(200).optional(),
	description: z.string().max(5000).optional(),
	tags: z.array(z.string().max(100)).max(30).optional(),
	hashtags: z.array(z.string().max(100)).max(30).optional(),
});

/** Utility representing schedulePostSchema. */
export const schedulePostSchema = socialPublishSchema.extend({
	scheduled_at: z.string().min(1),
});

/** Utility representing autoReframeSchema. */
export const autoReframeSchema = z.object({
	video_path: z.string().min(1),
	target_platform: z.enum(["tiktok", "youtube", "instagram", "twitter", "shorts", "reels"]),
});

/** Utility representing thumbnailGenerateSchema. */
export const thumbnailGenerateSchema = z.object({
	video_path: z.string().min(1),
	count: z.number().int().min(1).max(10).default(5),
});

/** Utility representing metadataGenerateSchema. */
export const metadataGenerateSchema = z.object({
	platform: z.enum(["tiktok", "youtube", "instagram", "twitter"]),
	title: z.string().max(200).optional(),
	description: z.string().max(5000).optional(),
	tags: z.array(z.string()).max(30).optional(),
	video_topic: z.string().max(500).optional(),
});

// ── Render Service Schema ─────────────────────────────────────────────────

export const renderJobSchema = z.object({
	projectId: z.string().min(1),
	format: z.enum(["mp4", "prores", "dcp", "aaf", "mov", "gif"]).default("mp4"),
});

// ── Integration Schema ────────────────────────────────────────────────────

export const integrationConnectSchema = z.object({
	platform: z.string().min(1),
});

// ── Rename Project (Form) ─────────────────────────────────────────────────

export const renameProjectSchema = z.object({
	name: nonEmptyString("Project name", 200),
});

// ── Uncontrolled Input Sanitization ───────────────────────────────────────

/** Sanitize a string by stripping null bytes and control chars (except newlines/tabs). */
export function sanitizeInput(input: string, maxLength = 500000): string {
	return input
		// eslint-disable-next-line no-control-regex
		.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
		.slice(0, maxLength);
}

/** Type helper: infer the input type from a Zod schema */
export type SchemaInput<T extends z.ZodTypeAny> = z.input<T>;
