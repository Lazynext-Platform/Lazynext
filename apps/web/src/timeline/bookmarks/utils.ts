/**
 * Bookmark utility functions — find, toggle, remove, update, move,
 * and query bookmarks on the timeline.
 *
 * @module timeline/bookmarks/utils
 */

import type { Bookmark } from "@/timeline";
import type { FrameRate } from "lazynext-wasm";
import { addMediaTime, roundFrameTime, type MediaTime } from "@/wasm";

function bookmarkTimeEqual({
	bookmarkTime,
	frameTime,
}: {
	bookmarkTime: MediaTime;
	frameTime: MediaTime;
}): boolean {
	return bookmarkTime === frameTime;
}

/** Finds the index of a bookmark at the given frame time. */
export function findBookmarkIndex({
	bookmarks,
	frameTime,
}: {
	bookmarks: Bookmark[];
	frameTime: MediaTime;
}): number {
	return bookmarks.findIndex((bookmark) =>
		bookmarkTimeEqual({ bookmarkTime: bookmark.time, frameTime }),
	);
}

/** Returns `true` if a bookmark exists at the given frame time. */
export function isBookmarkAtTime({
	bookmarks,
	frameTime,
}: {
	bookmarks: Bookmark[];
	frameTime: MediaTime;
}): boolean {
	return bookmarks.some((bookmark) =>
		bookmarkTimeEqual({ bookmarkTime: bookmark.time, frameTime }),
	);
}

/** Toggles a bookmark at the given time — adds if absent, removes if present. */
export function toggleBookmarkInArray({
	bookmarks,
	frameTime,
}: {
	bookmarks: Bookmark[];
	frameTime: MediaTime;
}): Bookmark[] {
	const bookmarkIndex = findBookmarkIndex({ bookmarks, frameTime });

	if (bookmarkIndex !== -1) {
		return bookmarks.filter((_, index) => index !== bookmarkIndex);
	}

	const newBookmarks = [...bookmarks, { time: frameTime }];
	return newBookmarks.slice().sort((a, b) => a.time - b.time);
}

/** Removes the bookmark at the given frame time. */
export function removeBookmarkFromArray({
	bookmarks,
	frameTime,
}: {
	bookmarks: Bookmark[];
	frameTime: MediaTime;
}): Bookmark[] {
	return bookmarks.filter(
		(bookmark) =>
			!bookmarkTimeEqual({ bookmarkTime: bookmark.time, frameTime }),
	);
}

/** Applies partial updates to the bookmark at the given frame time. */
export function updateBookmarkInArray({
	bookmarks,
	frameTime,
	updates,
}: {
	bookmarks: Bookmark[];
	frameTime: MediaTime;
	updates: Partial<Omit<Bookmark, "time">>;
}): Bookmark[] {
	const index = findBookmarkIndex({ bookmarks, frameTime });
	if (index === -1) {
		return bookmarks;
	}

	const updated = { ...bookmarks[index], ...updates };
	const result = [...bookmarks];
	result[index] = updated;
	return result;
}

/** Moves a bookmark from one time to another, re-sorting the array. */
export function moveBookmarkInArray({
	bookmarks,
	fromTime,
	toTime,
}: {
	bookmarks: Bookmark[];
	fromTime: MediaTime;
	toTime: MediaTime;
}): Bookmark[] {
	const index = findBookmarkIndex({ bookmarks, frameTime: fromTime });
	if (index === -1) {
		return bookmarks;
	}

	const updated = { ...bookmarks[index], time: toTime };
	const result = [...bookmarks];
	result[index] = updated;
	return result.slice().sort((a, b) => a.time - b.time);
}

/** Rounds a time to the nearest frame boundary. */
export function getFrameTime({
	time,
	fps,
}: {
	time: MediaTime;
	fps: FrameRate;
}): MediaTime {
	return roundFrameTime({ time, fps });
}

/** Returns the bookmark at the given frame time, or null. */
export function getBookmarkAtTime({
	bookmarks,
	frameTime,
}: {
	bookmarks: Bookmark[];
	frameTime: MediaTime;
}): Bookmark | null {
	const index = findBookmarkIndex({ bookmarks, frameTime });
	return index === -1 ? null : bookmarks[index];
}

/** Returns all bookmarks whose time range contains the given time. */
export function getBookmarksActiveAtTime({
	bookmarks,
	time,
}: {
	bookmarks: Bookmark[];
	time: MediaTime;
}): Bookmark[] {
	return bookmarks.filter((bookmark) => {
		const start = bookmark.time;
		const end =
			bookmark.duration != null && bookmark.duration > 0
				? addMediaTime({ a: start, b: bookmark.duration })
				: start;
		return time >= start && time <= end;
	});
}
