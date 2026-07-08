/**
 * Undo/redo context — React context provider with stack-based undo/redo
 * history, localStorage persistence, and configurable history size.
 *
 * @module components/editor/timeline/context/undo-redo-context
 */

import { createContext, useContext, useState } from "react";
import { ProjectJSON } from "../types";

const MAX_HISTORY = 20;

// Helper function for deep cloning
const deepClone = <T,>(obj: T): T => {
	return JSON.parse(JSON.stringify(obj));
};

interface UndoRedoState {
	/** Past states for undo. */
	past: ProjectJSON[];
	/** Current project state. */
	present: ProjectJSON | null;
	/** Future states for redo. */
	future: ProjectJSON[];
}

interface UndoRedoContextType {
	// State
	/** Whether an undo operation is available. */
	canUndo: boolean;
	/** Whether a redo operation is available. */
	canRedo: boolean;
	/** Current project state. */
	present: ProjectJSON | null;
	// Actions
	/** Record a new present state, pushing the previous onto the undo stack. */
	setPresent: (data: ProjectJSON) => void;
	/** Undo to the previous state and return it. */
	undo: () => ProjectJSON | null;
	/** Redo to the next state and return it. */
	redo: () => ProjectJSON | null;
	/** Clear all undo/redo history. */
	resetHistory: () => void;
	/** Return the last persisted present state, if any. */
	getLastPersistedState: () => ProjectJSON | null;
	// Configuration
	/** Disable and clear localStorage persistence. */
	disablePersistence: () => void;
}

const UndoRedoContext = createContext<UndoRedoContextType | undefined>(
	undefined,
);

// Local storage utilities
const STORAGE_KEY_PREFIX = "twick_undo_redo_";
const isBrowser =
	typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const saveToStorage = (key: string, state: UndoRedoState): void => {
	if (!isBrowser) return;

	try {
		window.localStorage.setItem(key, JSON.stringify(state));
	} catch (error) {
		console.warn("Failed to save undo-redo state to localStorage:", error);
	}
};

const loadFromStorage = (key: string): UndoRedoState | null => {
	if (!isBrowser) return null;

	try {
		const stored = window.localStorage.getItem(key);
		if (!stored) return null;
		return JSON.parse(stored);
	} catch (error) {
		console.warn("Failed to load undo-redo state from localStorage:", error);
		return null;
	}
};

export interface UndoRedoProviderProps {
	/** Child components wrapped by the provider. */
	children: React.ReactNode;
	/** Key used to persist history to localStorage. */
	persistenceKey?: string;
	/** Maximum number of history entries to retain. */
	maxHistorySize?: number;
}

export const UndoRedoProvider: React.FC<UndoRedoProviderProps> = ({
	children,
	persistenceKey,
	maxHistorySize = MAX_HISTORY,
}) => {
	const [state, setState] = useState<UndoRedoState>(() => {
		// Load from storage if persistence is enabled
		if (persistenceKey) {
			const stored = loadFromStorage(STORAGE_KEY_PREFIX + persistenceKey);
			if (stored) {
				return {
					past: stored.past,
					present: stored.present,
					future: stored.future,
				};
			}
		}

		return {
			past: [],
			present: null,
			future: [],
		};
	});

	// Save to storage whenever state changes (if persistence enabled)
	const saveState = (newState: UndoRedoState) => {
		if (persistenceKey) {
			saveToStorage(STORAGE_KEY_PREFIX + persistenceKey, newState);
		}
	};

	// When user makes a new change
	const setPresent = (data: ProjectJSON) => {
		setState((prevState) => {
			const newPast = [...prevState.past];
			if (prevState.present) {
				newPast.push(deepClone(prevState.present));
			}

			const newState: UndoRedoState = {
				past: newPast,
				present: deepClone(data),
				future: [], // Clear future because it's a new change
			};

			// Limit history size
			if (newState.past.length > maxHistorySize) {
				newState.past.shift(); // Remove oldest
			}

			saveState(newState);
			return newState;
		});
	};

	const undo = (): ProjectJSON | null => {
		let undoResult: ProjectJSON | null = null;

		setState((prevState) => {
			if (prevState.past.length === 0) return prevState;

			const previous = prevState.past[prevState.past.length - 1];
			const newState: UndoRedoState = {
				past: prevState.past.slice(0, -1), // Remove last item
				present: previous,
				future: prevState.present
					? [deepClone(prevState.present), ...prevState.future]
					: prevState.future,
			};

			undoResult = previous;
			saveState(newState);
			return newState;
		});

		return undoResult;
	};

	const redo = (): ProjectJSON | null => {
		let redoResult: ProjectJSON | null = null;

		setState((prevState) => {
			if (prevState.future.length === 0) return prevState;

			const next = prevState.future[0];
			const newState: UndoRedoState = {
				past: prevState.present
					? [...prevState.past, deepClone(prevState.present)]
					: prevState.past,
				present: next,
				future: prevState.future.slice(1), // Remove first item
			};

			// Limit history size
			if (newState.past.length > maxHistorySize) {
				newState.past.shift();
			}

			redoResult = next;
			saveState(newState);
			return newState;
		});

		return redoResult;
	};

	const getLastPersistedState = () => {
		if (persistenceKey) {
			const stored = loadFromStorage(STORAGE_KEY_PREFIX + persistenceKey);
			return stored?.present || null;
		}
		return null;
	};

	// Reset all history
	const resetHistory = () => {
		const newState: UndoRedoState = {
			past: [],
			present: null,
			future: [],
		};

		setState(newState);

		// Clear from storage too
		if (persistenceKey && isBrowser) {
			window.localStorage.removeItem(STORAGE_KEY_PREFIX + persistenceKey);
		}
	};

	const disablePersistence = () => {
		if (persistenceKey && isBrowser) {
			window.localStorage.removeItem(STORAGE_KEY_PREFIX + persistenceKey);
		}
	};

	const contextValue: UndoRedoContextType = {
		canUndo: state.past.length > 0,
		canRedo: state.future.length > 0,
		present: state.present,
		setPresent,
		undo,
		redo,
		resetHistory,
		getLastPersistedState,
		disablePersistence,
	};

	return (
		<UndoRedoContext.Provider value={contextValue}>
			{children}
		</UndoRedoContext.Provider>
	);
};

export const useUndoRedo = (): UndoRedoContextType => {
	const context = useContext(UndoRedoContext);
	if (context === undefined) {
		throw new Error("useUndoRedo must be used within an UndoRedoProvider");
	}
	return context;
};
