/** @module Zustand store for assets panel tabs, media view mode, and sort preferences */
import type { ElementType } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
	ArrowRightDoubleIcon,
	ClosedCaptionIcon,
	Folder03Icon,
	Happy01Icon,
	HeadphonesIcon,
	MagicWand05Icon,
	TextIcon,
	Settings01Icon,
	SlidersHorizontalIcon,
	ColorsIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

export type Tab =
	| "media"
	| "sounds"
	| "text"
	| "stickers"
	| "effects"
	| "transitions"
	| "captions"
	| "adjustment"
	| "settings"
	| "scripting";

export const ALL_TABS: {
	id: Tab;
	label: string;
	shortcut?: string;
	disabled?: boolean;
}[] = [
	{ id: "media", label: "Media" },
	{ id: "sounds", label: "Sounds" },
	{ id: "text", label: "Text", shortcut: "T" },
	{ id: "stickers", label: "Stickers", disabled: true },
	{ id: "effects", label: "Effects", disabled: false },
	{ id: "transitions", label: "Transitions", disabled: true },
	{ id: "captions", label: "Captions", disabled: false },
	{ id: "adjustment", label: "Adjustment", disabled: true },
	{ id: "scripting", label: "Scripting", disabled: false },
	{ id: "settings", label: "Settings" },
];

const createHugeiconsIcon =
	({ icon }: { icon: IconSvgElement }) =>
	// eslint-disable-next-line react/display-name
	({ className }: { className?: string }) => (
		<HugeiconsIcon icon={icon} className={className} />
	);

export const tabs = {
	media: {
		icon: createHugeiconsIcon({ icon: Folder03Icon }),
		label: "Media",
	},
	sounds: {
		icon: createHugeiconsIcon({ icon: HeadphonesIcon }),
		label: "Sounds",
	},
	text: {
		icon: createHugeiconsIcon({ icon: TextIcon }),
		label: "Text",
	},
	stickers: {
		icon: createHugeiconsIcon({ icon: Happy01Icon }),
		label: "Stickers",
	},
	effects: {
		icon: createHugeiconsIcon({ icon: MagicWand05Icon }),
		label: "Effects",
	},
	transitions: {
		icon: createHugeiconsIcon({ icon: ArrowRightDoubleIcon }),
		label: "Transitions",
	},
	captions: {
		icon: createHugeiconsIcon({ icon: ClosedCaptionIcon }),
		label: "Captions",
	},
	adjustment: {
		icon: createHugeiconsIcon({ icon: SlidersHorizontalIcon }),
		label: "Adjustment",
	},
	settings: {
		icon: createHugeiconsIcon({ icon: Settings01Icon }),
		label: "Settings",
	},
	scripting: {
		icon: createHugeiconsIcon({ icon: Settings01Icon }),
		label: "Scripting",
	},
} satisfies Record<
	Tab,
	{ icon: ElementType<{ className?: string }>; label: string }
>;

export type MediaViewMode = "grid" | "list";
export type MediaSortKey = "name" | "type" | "duration" | "size";
export type MediaSortOrder = "asc" | "desc";

interface AssetsPanelStore {
	/** Currently active tab. */
	activeTab: Tab;
	/** Set the active tab. */
	setActiveTab: (tab: Tab) => void;
	/** Media ID to highlight after navigation. */
	highlightMediaId: string | null;
	/** Jump to the media panel and highlight a media item. */
	requestRevealMedia: (mediaId: string) => void;
	/** Clear the highlight state. */
	clearHighlight: () => void;
	/** Media grid/list view mode. */
	mediaViewMode: MediaViewMode;
	/** Set the media view mode. */
	setMediaViewMode: (mode: MediaViewMode) => void;
	/** Current media sort key. */
	mediaSortBy: MediaSortKey;
	/** Current media sort order. */
	mediaSortOrder: MediaSortOrder;
	/** Set both media sort key and order. */
	setMediaSort: (args: { key: MediaSortKey; order: MediaSortOrder }) => void;
}

export const useAssetsPanelStore = create<AssetsPanelStore>()(
	persist(
		(set) => ({
			activeTab: "media",
			setActiveTab: (tab) => set({ activeTab: tab }),
			highlightMediaId: null,
			requestRevealMedia: (mediaId) =>
				set({ activeTab: "media", highlightMediaId: mediaId }),
			clearHighlight: () => set({ highlightMediaId: null }),
			mediaViewMode: "grid",
			setMediaViewMode: (mode) => set({ mediaViewMode: mode }),
			mediaSortBy: "name",
			mediaSortOrder: "asc",
			setMediaSort: ({ key, order }) =>
				set({ mediaSortBy: key, mediaSortOrder: order }),
		}),
		{
			name: "assets-panel",
			partialize: (state) => ({
				mediaViewMode: state.mediaViewMode,
				mediaSortBy: state.mediaSortBy,
				mediaSortOrder: state.mediaSortOrder,
			}),
		},
	),
);
