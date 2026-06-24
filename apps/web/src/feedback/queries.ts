import { generateUUID } from "@/utils/id";
import { db } from "@/db";
import { feedback } from "@/db/schema";
import type { FeedbackEntry, SubmitFeedbackInput } from "./types";

export async function submitFeedback({
	message,
}: SubmitFeedbackInput): Promise<FeedbackEntry> {
	const id = generateUUID();
	const now = new Date();

	// Persist feedback to the database
	await db.insert(feedback).values({
		id,
		message,
		createdAt: now,
	});

	return { id, message, createdAt: now.toISOString() };
}
