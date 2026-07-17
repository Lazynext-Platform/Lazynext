/** @module Zustand store for sound effects — search, playback, saved sounds, and timeline integration */
import { create } from "zustand";
import type { SoundEffect, SavedSound } from "@/sounds/types";
import { storageService } from "@/services/storage/service";
import { toast } from "sonner";
import { EditorCore } from "@/core";
import { buildLibraryAudioElement } from "@/timeline/element-utils";
import { mediaTimeFromSeconds } from "@/wasm";

interface SoundsStore {
	/** Top sound effects list. */
	topSoundEffects: SoundEffect[];
	/** Whether sounds are loading. */
	isLoading: boolean;
	/** Error message if loading failed. */
	error: string | null;
	/** Whether sounds have been loaded at least once. */
	hasLoaded: boolean;
	/** Whether to show only commercial sounds. */
	showCommercialOnly: boolean;
	/** Toggles the commercial filter. */
	toggleCommercialFilter: () => void;
	/** Current search query string. */
	searchQuery: string;
	/** Search results list. */
	searchResults: SoundEffect[];
	/** Whether a search is in progress. */
	isSearching: boolean;
	/** Search error message. */
	searchError: string | null;
	/** Last executed search query. */
	lastSearchQuery: string;
	/** Current scroll position. */
	scrollPosition: number;
	/** Current pagination page number. */
	currentPage: number;
	/** Whether there is a next page of results. */
	hasNextPage: boolean;
	/** Total number of results available. */
	totalCount: number;
	/** Whether more results are being loaded. */
	isLoadingMore: boolean;
	/** Saved/bookmarked sounds list. */
	savedSounds: SavedSound[];
	/** Whether saved sounds have been loaded. */
	isSavedSoundsLoaded: boolean;
	/** Whether saved sounds are currently loading. */
	isLoadingSavedSounds: boolean;
	/** Saved sounds error message. */
	savedSoundsError: string | null;

	/** Adds a sound to the timeline. */
	addSoundToTimeline: ({ sound }: { sound: SoundEffect }) => Promise<boolean>;
	/** Sets the top sound effects list. */
	setTopSoundEffects: ({ sounds }: { sounds: SoundEffect[] }) => void;
	/** Sets the loading state. */
	setLoading: ({ loading }: { loading: boolean }) => void;
	/** Sets the error state. */
	setError: ({ error }: { error: string | null }) => void;
	/** Sets the has-loaded flag. */
	setHasLoaded: ({ loaded }: { loaded: boolean }) => void;
	/** Sets the search query. */
	setSearchQuery: ({ query }: { query: string }) => void;
	/** Sets the search results. */
	setSearchResults: ({ results }: { results: SoundEffect[] }) => void;
	/** Sets the search loading state. */
	setSearching: ({ searching }: { searching: boolean }) => void;
	/** Sets the search error. */
	setSearchError: ({ error }: { error: string | null }) => void;
	/** Sets the last search query. */
	setLastSearchQuery: ({ query }: { query: string }) => void;
	/** Sets the scroll position. */
	setScrollPosition: ({ position }: { position: number }) => void;
	/** Sets the current page. */
	setCurrentPage: ({ page }: { page: number }) => void;
	/** Sets whether there is a next page. */
	setHasNextPage: ({ hasNext }: { hasNext: boolean }) => void;
	/** Sets the total count. */
	setTotalCount: ({ count }: { count: number }) => void;
	/** Sets the loading-more state. */
	setLoadingMore: ({ loading }: { loading: boolean }) => void;
	/** Appends results to the search results list. */
	appendSearchResults: ({ results }: { results: SoundEffect[] }) => void;
	/** Appends results to the top sounds list. */
	appendTopSounds: ({ results }: { results: SoundEffect[] }) => void;
	/** Resets pagination to the initial state. */
	resetPagination: () => void;
	/** Loads saved sounds from storage. */
	loadSavedSounds: () => Promise<void>;
	/** Saves a sound effect to storage. */
	saveSoundEffect: ({
		soundEffect,
	}: {
		/** Sound effect to save */
		soundEffect: SoundEffect;
	}) => Promise<void>;
	/** Removes a saved sound by ID. */
	removeSavedSound: ({ soundId }: { soundId: number }) => Promise<void>;
	/** Checks whether a sound is saved. */
	isSoundSaved: ({ soundId }: { soundId: number }) => boolean;
	/** Toggles a sound's saved state. */
	toggleSavedSound: ({
		soundEffect,
	}: {
		/** Sound effect to toggle */
		soundEffect: SoundEffect;
	}) => Promise<void>;
	/** Clears all saved sounds. */
	clearSavedSounds: () => Promise<void>;
}

/** Custom hook providing useSoundsStore functionality. */
export const useSoundsStore = create<SoundsStore>((set, get) => ({
	topSoundEffects: [],
	isLoading: false,
	error: null,
	hasLoaded: false,
	showCommercialOnly: true,

	toggleCommercialFilter: () => {
		set((state) => ({ showCommercialOnly: !state.showCommercialOnly }));
	},

	searchQuery: "",
	searchResults: [],
	isSearching: false,
	searchError: null,
	lastSearchQuery: "",
	scrollPosition: 0,
	currentPage: 1,
	hasNextPage: false,
	totalCount: 0,
	isLoadingMore: false,
	savedSounds: [],
	isSavedSoundsLoaded: false,
	isLoadingSavedSounds: false,
	savedSoundsError: null,

	setTopSoundEffects: ({ sounds }) => set({ topSoundEffects: sounds }),
	setLoading: ({ loading }) => set({ isLoading: loading }),
	setError: ({ error }) => set({ error }),
	setHasLoaded: ({ loaded }) => set({ hasLoaded: loaded }),
	setSearchQuery: ({ query }) => set({ searchQuery: query }),
	setSearchResults: ({ results }) =>
		set({ searchResults: results, currentPage: 1 }),
	setSearching: ({ searching }) => set({ isSearching: searching }),
	setSearchError: ({ error }) => set({ searchError: error }),
	setLastSearchQuery: ({ query }) => set({ lastSearchQuery: query }),
	setScrollPosition: ({ position }) => set({ scrollPosition: position }),
	setCurrentPage: ({ page }) => set({ currentPage: page }),
	setHasNextPage: ({ hasNext }) => set({ hasNextPage: hasNext }),
	setTotalCount: ({ count }) => set({ totalCount: count }),
	setLoadingMore: ({ loading }) => set({ isLoadingMore: loading }),

	appendSearchResults: ({ results }) =>
		set((state) => ({
			searchResults: [...state.searchResults, ...results],
		})),

	appendTopSounds: ({ results }) =>
		set((state) => ({
			topSoundEffects: [...state.topSoundEffects, ...results],
		})),

	resetPagination: () =>
		set({
			currentPage: 1,
			hasNextPage: false,
			totalCount: 0,
			isLoadingMore: false,
		}),

	loadSavedSounds: async () => {
		if (get().isSavedSoundsLoaded) return;

		try {
			set({ isLoadingSavedSounds: true, savedSoundsError: null });
			const savedSoundsData = await storageService.loadSavedSounds();
			set({
				savedSounds: savedSoundsData.sounds,
				isSavedSoundsLoaded: true,
				isLoadingSavedSounds: false,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to load saved sounds";
			set({
				savedSoundsError: errorMessage,
				isLoadingSavedSounds: false,
			});
			console.error("Failed to load saved sounds:", error);
		}
	},

	saveSoundEffect: async ({ soundEffect }) => {
		try {
			await storageService.saveSoundEffect({ soundEffect });

			const savedSoundsData = await storageService.loadSavedSounds();
			set({ savedSounds: savedSoundsData.sounds });
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to save sound";
			set({ savedSoundsError: errorMessage });
			toast.error("Failed to save sound");
			console.error("Failed to save sound:", error);
		}
	},

	removeSavedSound: async ({ soundId }) => {
		try {
			await storageService.removeSavedSound({ soundId });

			set((state) => ({
				savedSounds: state.savedSounds.filter((sound) => sound.id !== soundId),
			}));
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to remove sound";
			set({ savedSoundsError: errorMessage });
			toast.error("Failed to remove sound");
			console.error("Failed to remove sound:", error);
		}
	},

	isSoundSaved: ({ soundId }) => {
		const { savedSounds } = get();
		return savedSounds.some((sound) => sound.id === soundId);
	},

	toggleSavedSound: async ({ soundEffect }) => {
		const { isSoundSaved, saveSoundEffect, removeSavedSound } = get();

		if (isSoundSaved({ soundId: soundEffect.id })) {
			await removeSavedSound({ soundId: soundEffect.id });
		} else {
			await saveSoundEffect({ soundEffect });
		}
	},

	clearSavedSounds: async () => {
		try {
			await storageService.clearSavedSounds();
			set({
				savedSounds: [],
				savedSoundsError: null,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to clear saved sounds";
			set({ savedSoundsError: errorMessage });
			toast.error("Failed to clear saved sounds");
			console.error("Failed to clear saved sounds:", error);
		}
	},

	addSoundToTimeline: async ({ sound }) => {
		const audioUrl = sound.previewUrl;
		if (!audioUrl) {
			toast.error("Sound file not available");
			return false;
		}

		try {
			const editor = EditorCore.getInstance();
			const currentTime = editor.playback.getCurrentTime();

			const response = await fetch(audioUrl);
			if (!response.ok)
				throw new Error(`Failed to download audio: ${response.statusText}`);

			const arrayBuffer = await response.arrayBuffer();
			const audioContext = new AudioContext();
			const buffer = await audioContext.decodeAudioData(arrayBuffer);

			const element = buildLibraryAudioElement({
				sourceUrl: audioUrl,
				name: sound.name,
				duration: mediaTimeFromSeconds({ seconds: sound.duration }),
				startTime: currentTime,
				buffer,
			});

			editor.timeline.insertElement({
				placement: { mode: "auto", trackType: "audio" },
				element,
			});
			return true;
		} catch (error) {
			console.error("Failed to add sound to timeline:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to add sound to timeline",
				{ id: `sound-${sound.id}` },
			);
			return false;
		}
	},
}));
