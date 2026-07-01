/**
 * @module utils/date
 * @description Date formatting utilities.
 */

/** Formats a Date as `"Mon DD, YYYY"` in en-US locale. */
export function formatDate({ date }: { date: Date }): string {
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}
