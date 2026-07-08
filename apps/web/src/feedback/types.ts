/** @module Feedback types and constants */
export const MAX_MESSAGE_LENGTH = 5000;

export interface FeedbackEntry {
	/** Unique feedback identifier. */
	id: string;
	/** Feedback message content. */
	message: string;
	/** ISO timestamp of creation. */
	createdAt: string;
}

export interface SubmitFeedbackInput {
	/** Feedback message content. */
	message: string;
}
