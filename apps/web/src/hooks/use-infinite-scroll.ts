/**
 * Hook that triggers paginated data loading when the user scrolls
 * near the bottom of a scrollable container.
 *
 * @module hooks/use-infinite-scroll
 */

import { useRef, useCallback } from "react";

interface UseInfiniteScrollOptions {
	/** Callback invoked when more data should be loaded. */
	onLoadMore: () => void;
	/** Whether there is more data to load. */
	hasMore: boolean;
	/** Whether data is currently loading. */
	isLoading: boolean;
	/** Pixel distance from the bottom to trigger a load. */
	threshold?: number;
	/** Whether infinite scroll is active. */
	enabled?: boolean;
}

/**
 * Provides infinite scroll behavior for a scrollable container.
 *
 * @param onLoadMore - callback when more data should be loaded.
 * @param hasMore - whether there is more data to load.
 * @param isLoading - whether data is currently loading.
 * @param threshold - pixel distance from bottom to trigger load (default 200).
 * @param enabled - whether infinite scroll is active (default true).
 * @returns a ref for the scroll container and an onScroll handler.
 */
export function useInfiniteScroll({
	onLoadMore,
	hasMore,
	isLoading,
	threshold = 200,
	enabled = true,
}: UseInfiniteScrollOptions) {
	const scrollAreaRef = useRef<HTMLDivElement>(null);

	const handleScroll = useCallback(
		(event: React.UIEvent<HTMLDivElement>) => {
			if (!enabled) return;

			const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
			const nearBottom = scrollTop + clientHeight >= scrollHeight - threshold;

			if (nearBottom && hasMore && !isLoading) {
				onLoadMore();
			}
		},
		[onLoadMore, hasMore, isLoading, threshold, enabled],
	);

	return { scrollAreaRef, handleScroll };
}
