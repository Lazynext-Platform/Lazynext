/** @module Zustand store for active property tabs and transform scale lock state */
import { create } from "zustand";

interface PropertiesState {
	/** Active property tab id per element type. */
	activeTabPerType: Record<string, string>;
	/** Sets the active tab for an element type. */
	setActiveTab: (args: { elementType: string; tabId: string }) => void;
	/** Whether transform scale is locked to aspect ratio. */
	isTransformScaleLocked: boolean;
	/** Sets the transform scale lock state. */
	setTransformScaleLocked: (args: { locked: boolean }) => void;
}

export const usePropertiesStore = create<PropertiesState>()((set) => ({
	activeTabPerType: {},
	setActiveTab: ({ elementType, tabId }) =>
		set((state) => ({
			activeTabPerType: { ...state.activeTabPerType, [elementType]: tabId },
		})),
	isTransformScaleLocked: false,
	setTransformScaleLocked: ({ locked }) =>
		set({ isTransformScaleLocked: locked }),
}));
