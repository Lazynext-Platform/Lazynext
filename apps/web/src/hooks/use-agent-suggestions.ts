/**
 * Hook that polls the Lazynext AI agent for timeline improvement
 * suggestions and manages the agent lifecycle.
 *
 * @module hooks/use-agent-suggestions
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ────────────────────────────────────────────────────────────

export type SuggestionCategory =
	| "SilenceRemoval"
	| "AudioLeveling"
	| "PacingAdjustment"
	| "ClipHealth"
	| "ColorBalance"
	| "Transitions"
	| "CaptionSync"
	| "ExportOptimization";

export type RiskLevel = "Low" | "Medium" | "High";

export type AgentMode = "SuggestOnly" | "AutoExecute";

export type AgentStatus = "Active" | "Stopped";

export interface AgentSuggestion {
	/** Unique suggestion identifier. */
	id: string;
	/** Category of the suggested change. */
	category: SuggestionCategory;
	/** Short title describing the suggestion. */
	title: string;
	/** Detailed description of the suggestion. */
	description: string;
	/** Risk level of applying the suggestion. */
	riskLevel: RiskLevel;
}

export interface AgentState {
	/** Current agent status. */
	status: AgentStatus;
	/** Current agent operating mode. */
	mode: AgentMode;
}

interface UseAgentSuggestionsReturn {
	/** Current list of agent suggestions. */
	suggestions: AgentSuggestion[];
	/** Current agent state, or null if unknown. */
	status: AgentState | null;
	/** Whether an initial load is in progress. */
	isLoading: boolean;
	/** Latest error message, or null. */
	error: string | null;
	/** Executes the suggestion with the given ID. */
	executeSuggestion: (id: string) => Promise<void>;
	/** Dismisses the suggestion with the given ID. */
	dismissSuggestion: (id: string) => Promise<void>;
	/** Starts the agent. */
	startAgent: () => Promise<void>;
	/** Stops the agent. */
	stopAgent: () => Promise<void>;
}

// ── API helpers ──────────────────────────────────────────────────────

const API_BASE = "/api/v1/agent";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, init);

	if (!response.ok) {
		let message: string;
		try {
			const body = await response.json();
			message = body.error || body.message || `HTTP ${response.status}`;
		} catch {
			message = `HTTP ${response.status}`;
		}
		throw new Error(message);
	}

	return response.json() as Promise<T>;
}

// ── Hook ─────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 15_000;

/**
 * Manages the AI agent suggestions polling loop and lifecycle.
 *
 * Polls `GET /api/v1/agent/suggestions` every 15 seconds while active.
 * Provides callbacks to execute, dismiss individual suggestions and
 * to start/stop the agent.
 */
export function useAgentSuggestions(): UseAgentSuggestionsReturn {
	const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([]);
	const [status, setStatus] = useState<AgentState | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Keep a ref so the interval always sees the latest status without
	// re-creating the timer every time status changes.
	const statusRef = useRef<AgentState | null>(null);
	// eslint-disable-next-line react-hooks/refs
	statusRef.current = status;

	// ── Initial fetch + status ────────────────────────────────────
	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			setIsLoading(true);
			setError(null);

			try {
				const [suggs, st]: [AgentSuggestion[], AgentState] =
					await Promise.all([
						fetchJSON<AgentSuggestion[]>(`${API_BASE}/suggestions`),
						fetchJSON<AgentState>(`${API_BASE}/status`).catch(
							(): AgentState => ({
								status: "Stopped",
								mode: "SuggestOnly",
							}),
						),
					]);

				if (cancelled) return;
				setSuggestions(suggs);
				setStatus(st);
			} catch (err) {
				if (cancelled) return;
				setError(
					err instanceof Error ? err.message : "Failed to fetch suggestions",
				);
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		};

		load();

		// ── Polling ────────────────────────────────────────────
		const interval = setInterval(async () => {
			// Don't poll suggestions if the agent is stopped
			if (statusRef.current?.status === "Stopped") return;

			try {
				const suggs = await fetchJSON<AgentSuggestion[]>(
					`${API_BASE}/suggestions`,
				);
				setSuggestions(suggs);
				setError(null);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to poll suggestions",
				);
			}
		}, POLL_INTERVAL_MS);

		return () => {
			cancelled = true;
			clearInterval(interval);
		};
		// Run only on mount; polling handles live updates.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// ── Actions ──────────────────────────────────────────────────

	const executeSuggestion = useCallback(async (id: string) => {
		await fetchJSON(`${API_BASE}/suggestions/${id}/execute`, {
			method: "POST",
		});
		setSuggestions((prev) => prev.filter((s) => s.id !== id));
	}, []);

	const dismissSuggestion = useCallback(async (id: string) => {
		await fetchJSON(`${API_BASE}/suggestions/${id}/dismiss`, {
			method: "POST",
		});
		setSuggestions((prev) => prev.filter((s) => s.id !== id));
	}, []);

	const startAgent = useCallback(async () => {
		const st = await fetchJSON<AgentState>(`${API_BASE}/start`, {
			method: "POST",
		});
		setStatus(st);
		setError(null);
	}, []);

	const stopAgent = useCallback(async () => {
		const st = await fetchJSON<AgentState>(`${API_BASE}/stop`, {
			method: "POST",
		});
		setStatus(st);
		setError(null);
	}, []);

	return {
		suggestions,
		status,
		isLoading,
		error,
		executeSuggestion,
		dismissSuggestion,
		startAgent,
		stopAgent,
	};
}
