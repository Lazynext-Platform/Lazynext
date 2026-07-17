/**
 * Agent Suggestions panel — displays autonomous AI improvement
 * suggestions for the video editor timeline with execute/dismiss
 * actions and agent lifecycle controls.
 *
 * @module components/editor/panels/agent-suggestions
 */

import React, { useState } from "react";
import {
	Bot,
	ChevronDown,
	ChevronUp,
	Loader2,
	Play,
	Square,
	Zap,
	X,
	Volume2,
	TrendingUp,
	Scissors,
	Palette,
	Type,
	Globe,
	Sliders,
	Gauge,
	AlertTriangle,
	Activity,
} from "lucide-react";
import type {
	SuggestionCategory,
	RiskLevel,
	AgentSuggestion,
} from "@/hooks/use-agent-suggestions";
import { useAgentSuggestions } from "@/hooks/use-agent-suggestions";
import { motion, AnimatePresence } from "framer-motion";

// ── Category config ──────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
	SuggestionCategory,
	{ label: string; icon: React.ElementType; color: string }
> = {
	SilenceRemoval: {
		label: "Silence Removal",
		icon: Volume2,
		color: "text-violet-400",
	},
	AudioLeveling: {
		label: "Audio Leveling",
		icon: Sliders,
		color: "text-cyan-400",
	},
	PacingAdjustment: {
		label: "Pacing",
		icon: Gauge,
		color: "text-emerald-400",
	},
	ClipHealth: {
		label: "Clip Health",
		icon: Scissors,
		color: "text-amber-400",
	},
	ColorBalance: {
		label: "Color",
		icon: Palette,
		color: "text-rose-400",
	},
	Transitions: {
		label: "Transitions",
		icon: TrendingUp,
		color: "text-sky-400",
	},
	CaptionSync: {
		label: "Captions",
		icon: Type,
		color: "text-purple-400",
	},
	ExportOptimization: {
		label: "Export",
		icon: Globe,
		color: "text-orange-400",
	},
};

const RISK_CONFIG: Record<RiskLevel, { label: string; className: string }> = {
	Low: { label: "Low risk", className: "text-emerald-400 bg-emerald-500/10" },
	Medium: {
		label: "Medium risk",
		className: "text-amber-400 bg-amber-500/10",
	},
	High: { label: "High risk", className: "text-red-400 bg-red-500/10" },
};

// ── Sub-components ───────────────────────────────────────────────────

function SuggestionCard({
	suggestion,
	onExecute,
	onDismiss,
	canAutoExecute,
}: {
	suggestion: AgentSuggestion;
	onExecute: (id: string) => void;
	onDismiss: (id: string) => void;
	canAutoExecute: boolean;
}) {
	const [isExecuting, setIsExecuting] = useState(false);
	const [isDismissing, setIsDismissing] = useState(false);

	const categoryCfg = CATEGORY_CONFIG[suggestion.category];
	const riskCfg = RISK_CONFIG[suggestion.riskLevel];
	const CategoryIcon = categoryCfg.icon;
	const showExecuteButton =
		suggestion.riskLevel === "Low" || canAutoExecute;

	const handleExecute = async () => {
		setIsExecuting(true);
		try {
			await onExecute(suggestion.id);
		} catch {
			setIsExecuting(false);
		}
	};

	const handleDismiss = async () => {
		setIsDismissing(true);
		try {
			await onDismiss(suggestion.id);
		} catch {
			setIsDismissing(false);
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -8, height: 0 }}
			transition={{ duration: 0.2 }}
			className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 space-y-2.5 hover:border-border transition-colors"
		>
			{/* Category badge */}
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5">
					<CategoryIcon
						className={`w-3.5 h-3.5 ${categoryCfg.color}`}
					/>
					<span className="text-[10px] font-medium text-muted uppercase tracking-wider">
						{categoryCfg.label}
					</span>
				</div>
				<span
					className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${riskCfg.className}`}
				>
					{riskCfg.label}
				</span>
			</div>

			{/* Title & description */}
			<p className="text-sm font-semibold text-foreground/90 leading-snug">
				{suggestion.title}
			</p>
			<p className="text-xs text-muted leading-relaxed">
				{suggestion.description}
			</p>

			{/* Actions */}
			<div className="flex gap-2 pt-1">
				{showExecuteButton && (
					<button
						onClick={handleExecute}
						disabled={isExecuting}
						className="flex-1 flex items-center justify-center gap-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 text-xs font-medium py-1.5 rounded-lg border border-cyan-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isExecuting ? (
							<Loader2 className="w-3 h-3 animate-spin" />
						) : (
							<Zap className="w-3 h-3" />
						)}
						<span>Execute</span>
					</button>
				)}
				<button
					onClick={handleDismiss}
					disabled={isDismissing}
					className={`${showExecuteButton ? "flex-1" : "flex-1"} flex items-center justify-center gap-1.5 bg-glass hover:bg-hover text-muted hover:text-foreground/90 text-xs font-medium py-1.5 rounded-lg border border-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
				>
					{isDismissing ? (
						<Loader2 className="w-3 h-3 animate-spin" />
					) : (
						<X className="w-3 h-3" />
					)}
					<span>Dismiss</span>
				</button>
			</div>
		</motion.div>
	);
}

// ── Main component ───────────────────────────────────────────────────

export function AgentSuggestions() {
	const {
		suggestions,
		status,
		isLoading,
		error,
		executeSuggestion,
		dismissSuggestion,
		startAgent,
		stopAgent,
	} = useAgentSuggestions();

	const [isCollapsed, setIsCollapsed] = useState(false);
	const [isToggling, setIsToggling] = useState(false);

	const isAgentRunning = status?.status === "Active";

	const handleToggleAgent = async () => {
		setIsToggling(true);
		try {
			if (isAgentRunning) {
				await stopAgent();
			} else {
				await startAgent();
			}
		} catch {
			// error state handled by the hook
		} finally {
			setIsToggling(false);
		}
	};

	return (
		<div className="w-80 h-full bg-neutral-900/80 backdrop-blur-2xl border-l border-border flex flex-col font-sans">
			{/* Header */}
			<button
				onClick={() => setIsCollapsed((p) => !p)}
				className="flex items-center justify-between p-4 border-b border-border bg-neutral-950/40 cursor-pointer hover:bg-neutral-950/60 transition-colors"
			>
				<div className="flex items-center gap-2">
					<Bot className="w-5 h-5 text-cyan-400" />
					<h2 className="font-semibold text-foreground/90 tracking-wide">
						AI Suggestions
					</h2>
					{!isLoading && suggestions.length > 0 && (
						<span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-cyan-400 bg-cyan-500/15 rounded-full border border-cyan-500/20">
							{suggestions.length}
						</span>
					)}
				</div>
				{isCollapsed ? (
					<ChevronDown className="w-4 h-4 text-muted" />
				) : (
					<ChevronUp className="w-4 h-4 text-muted" />
				)}
			</button>

			<AnimatePresence initial={false}>
				{!isCollapsed && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="flex-1 flex flex-col overflow-hidden"
					>
						{/* Agent status bar */}
						<div className="p-4 border-b border-border bg-glass">
							<div className="flex items-center justify-between gap-3">
								<div className="flex items-center gap-2">
									<div
										className={`w-2 h-2 rounded-full ${
											isAgentRunning
												? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
												: "bg-glass"
										}`}
									/>
									<span className="text-xs text-muted">
										Agent:{" "}
										<span
											className={
												isAgentRunning
													? "text-emerald-400 font-medium"
													: "text-muted"
											}
										>
											{isAgentRunning
												? `Active (${status?.mode ?? "SuggestOnly"})`
												: "Stopped"}
										</span>
									</span>
								</div>

								<button
									onClick={handleToggleAgent}
									disabled={isToggling}
									className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
										isAgentRunning
											? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
											: "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
									}`}
								>
									{isToggling ? (
										<Loader2 className="w-3 h-3 animate-spin" />
									) : isAgentRunning ? (
										<Square className="w-3 h-3" />
									) : (
										<Play className="w-3 h-3" />
									)}
									<span>
										{isToggling
											? "..."
											: isAgentRunning
												? "Stop"
												: "Start"}
									</span>
								</button>
							</div>
						</div>

						{/* Content */}
						<div className="flex-1 overflow-y-auto p-4">
							{/* Error state */}
							{error && (
								<div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
									<AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
									<p className="text-xs text-red-400/90 leading-relaxed">
										{error}
									</p>
								</div>
							)}

							{/* Loading state */}
							{isLoading && (
								<div className="flex items-center justify-center py-12">
									<Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
								</div>
							)}

							{/* Empty state */}
							{!isLoading && !error && suggestions.length === 0 && (
								<div className="flex flex-col items-center justify-center py-12 px-4 text-center">
									<Activity className="w-8 h-8 text-muted/30 mb-3" />
									<p className="text-sm text-muted font-medium leading-relaxed">
										No suggestions right now
									</p>
									<p className="text-xs text-muted/50 mt-1 leading-relaxed">
										The AI is watching your timeline
									</p>
								</div>
							)}

							{/* Suggestions list */}
							{!isLoading &&
								suggestions.length > 0 && (
									<div className="space-y-3">
										<AnimatePresence>
											{suggestions.map((s) => (
												<SuggestionCard
													key={s.id}
													suggestion={s}
													onExecute={executeSuggestion}
													onDismiss={dismissSuggestion}
													canAutoExecute={
														status?.mode === "AutoExecute"
													}
												/>
											))}
										</AnimatePresence>
									</div>
								)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
