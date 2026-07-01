/**
 * Emits snap points from timeline bookmarks for snap-to-bookmark behavior.
 *
 * @module timeline/bookmarks/snap-source
 */

import type { Bookmark } from "@/timeline";
import type { SnapPoint } from "@/timeline/snapping";
import type { MediaTime } from "@/wasm";

/**
 * Returns bookmark-type snap points for all bookmarks, except the one
 * at the optionally excluded time.
 */
export function getBookmarkSnapPoints({
	bookmarks,
	excludeBookmarkTime,
}: {
	bookmarks: Bookmark[];
	excludeBookmarkTime?: MediaTime;
}): SnapPoint[] {
	return bookmarks.flatMap((bookmark) => {
		if (excludeBookmarkTime != null && bookmark.time === excludeBookmarkTime) {
			return [];
		}

		return [
			{ time: bookmark.time, type: "bookmark" satisfies SnapPoint["type"] },
		];
	});
}
