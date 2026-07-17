/**
 * Command Palette — Cmd+K / Ctrl+K modal overlay with fuzzy search,
 * keyboard navigation, recent commands, and arrow/enter/escape keys.
 *
 * @module components/editor/CommandPalette
 */

"use client";

import React, {
	useState,
	useEffect,
	useCallback,
	useRef,
	useMemo,
} from "react";
import {
	Search,
	Scissors,
	SlidersHorizontal,
	Download,
	Wand2,
	Clock,
	Type,
	Music,
	Layers,
	FastForward,
	SkipBack,
	Play,
	Pause,
	Copy,
	Crop,
	Monitor,
	Share2,
	Command,
} from "lucide-react";
import { cn } from "@/utils/ui";
import { useEditorState } from "./useEditorState";

interface PaletteCommand {
	/** Unique command identifier. */
	id: string;
	/** Display label for the command. */
	label: string;
	/** Short description of what the command does. */
	description: string;
	/** Category group for organizing commands. */
	category: string;
	/** Icon component from lucide-react. */
	icon: React.ElementType;
	/** Keyboard shortcut hint (e.g. "Cmd+K"). */
	shortcut?: string;
	/** Handler invoked when the command is executed. */
	action: () => void;
	/** Search keywords for fuzzy matching. */
	keywords: string[];
}

/** Fuzzy match a query against a string. Higher score = better match. */
function fuzzyMatch(query: string, target: string): number {
	const lowerQuery = query.toLowerCase();
	const lowerTarget = target.toLowerCase();

	if (lowerTarget.includes(lowerQuery)) return 100 - lowerQuery.length;
	if (lowerTarget.startsWith(lowerQuery)) return 90;

	let score = 0;
	let qIdx = 0;
	for (let i = 0; i < lowerTarget.length && qIdx < lowerQuery.length; i++) {
		if (lowerTarget[i] === lowerQuery[qIdx]) {
			qIdx++;
			score += 10;
		}
	}
	return qIdx === lowerQuery.length ? score : 0;
}

/** Get a platform-aware modifier key label. */
function getModKey(): string {
	if (typeof navigator === "undefined") return "Ctrl";
	return navigator.platform.toLowerCase().includes("mac") ? "Cmd" : "Ctrl";
}

/** React component rendering CommandPalette. */
export function CommandPalette() {
	const {
		currentTime,
		setCurrentTime,
		isPlaying,
		setIsPlaying,
		activeTool,
		setActiveTool,
		showCommandPalette,
		setShowCommandPalette,
	} = useEditorState();

	const [query, setQuery] = useState("");
	const [selectedIdx, setSelectedIdx] = useState(0);
	const [recentCommands, setRecentCommands] = useState<string[]>([]);
	const inputRef = useRef<HTMLInputElement>(null);
	const modKey = useMemo(() => getModKey(), []);

	// Build available commands
	const commands: PaletteCommand[] = useMemo(
		() => [
			{
				id: "search-timeline",
				label: "Search Timeline",
				description: "Find clips, markers, or edits in the timeline",
				category: "Navigation",
				icon: Search,
				shortcut: `${modKey}+F`,
				action: () => {
					setShowCommandPalette(false);
					// Scroll timeline to matching result
				},
				keywords: ["find", "search", "timeline", "clip", "marker"],
			},
			{
				id: "jump-to-start",
				label: "Jump to Start",
				description: "Move playhead to the beginning of the timeline",
				category: "Navigation",
				icon: SkipBack,
				shortcut: "Home",
				action: () => {
					setCurrentTime(0);
					setShowCommandPalette(false);
				},
				keywords: ["start", "beginning", "home", "first", "frame"],
			},
			{
				id: "play-pause",
				label: "Play / Pause",
				description: "Toggle timeline playback",
				category: "Playback",
				icon: isPlaying ? Pause : Play,
				shortcut: "Space",
				action: () => {
					setIsPlaying(!isPlaying);
					setShowCommandPalette(false);
				},
				keywords: ["play", "pause", "stop", "start", "resume"],
			},
			{
				id: "skip-forward",
				label: "Skip Forward 30s",
				description: "Jump 30 frames forward",
				category: "Playback",
				icon: FastForward,
				shortcut: "Shift+→",
				action: () => {
					setCurrentTime(currentTime + 30);
					setShowCommandPalette(false);
				},
				keywords: ["forward", "skip", "next", "advance"],
			},
			{
				id: "skip-back",
				label: "Skip Back 30s",
				description: "Jump 30 frames backward",
				category: "Playback",
				icon: SkipBack,
				shortcut: "Shift+←",
				action: () => {
					setCurrentTime(Math.max(0, currentTime - 30));
					setShowCommandPalette(false);
				},
				keywords: ["back", "previous", "rewind", "backward"],
			},
			{
				id: "blade-tool",
				label: "Blade Tool",
				description: "Activate the blade/razor tool for cutting clips",
				category: "Tools",
				icon: Scissors,
				shortcut: "B",
				action: () => {
					setActiveTool(
						activeTool === "blade" ? "select" : "blade",
					);
					setShowCommandPalette(false);
				},
				keywords: ["cut", "blade", "split", "slice", "razor"],
			},
			{
				id: "select-tool",
				label: "Select Tool",
				description: "Activate the default selection tool",
				category: "Tools",
				icon: Type,
				shortcut: "V",
				action: () => {
					setActiveTool("select");
					setShowCommandPalette(false);
				},
				keywords: ["select", "pointer", "move"],
			},
			{
				id: "hand-tool",
				label: "Hand / Pan Tool",
				description: "Activate the hand tool for timeline panning",
				category: "Tools",
				icon: Monitor,
				shortcut: "H",
				action: () => {
					setActiveTool(
						activeTool === "hand" ? "select" : "hand",
					);
					setShowCommandPalette(false);
				},
				keywords: ["pan", "hand", "move", "scroll"],
			},
			{
				id: "ai-edit",
				label: "AI Edit",
				description: "Open the Lazynext AI Agent chat to describe your edit",
				category: "AI",
				icon: Wand2,
				action: () => {
					setShowCommandPalette(false);
				},
				keywords: ["ai", "copilot", "agent", "smart", "magic"],
			},
			{
				id: "color-grade",
				label: "Apply Color Grade",
				description: "Open the color grading panel",
				category: "Effects",
				icon: SlidersHorizontal,
				action: () => {
					setShowCommandPalette(false);
				},
				keywords: ["color", "grade", "lut", "look", "cinematic"],
			},
			{
				id: "add-text",
				label: "Add Text Overlay",
				description: "Add a text layer to the current frame",
				category: "Effects",
				icon: Type,
				action: () => {
					setShowCommandPalette(false);
				},
				keywords: ["text", "title", "overlay", "subtitle"],
			},
			{
				id: "add-transition",
				label: "Add Transition",
				description: "Insert a cross-dissolve transition between clips",
				category: "Effects",
				icon: Layers,
				action: () => {
					setShowCommandPalette(false);
				},
				keywords: ["transition", "dissolve", "fade", "wipe"],
			},
			{
				id: "export-project",
				label: "Export Project",
				description: "Render and export the current project",
				category: "Export",
				icon: Download,
				shortcut: `${modKey}+E`,
				action: () => {
					setShowCommandPalette(false);
				},
				keywords: [
					"export",
					"render",
					"download",
					"output",
					"mp4",
				],
			},
			{
				id: "share-project",
				label: "Share Project",
				description: "Generate a shareable link to this project",
				category: "Export",
				icon: Share2,
				action: () => {
					setShowCommandPalette(false);
				},
				keywords: ["share", "link", "collaborate", "invite"],
			},
			{
				id: "duplicate-clip",
				label: "Duplicate Selected Clip",
				description: "Create a copy of the currently selected clip",
				category: "Edit",
				icon: Copy,
				shortcut: `${modKey}+D`,
				action: () => {
					setShowCommandPalette(false);
				},
				keywords: ["duplicate", "copy", "clone", "repeat"],
			},
			{
				id: "crop-clip",
				label: "Crop / Reframe Clip",
				description: "Open the crop and transform panel",
				category: "Edit",
				icon: Crop,
				action: () => {
					setShowCommandPalette(false);
				},
				keywords: ["crop", "reframe", "resize", "transform"],
			},
			{
				id: "audio-mixer",
				label: "Audio Mixer",
				description: "Open the audio mixing panel with EQ controls",
				category: "Edit",
				icon: Music,
				action: () => {
					setShowCommandPalette(false);
				},
				keywords: ["audio", "mixer", "volume", "eq", "sound"],
			},
		],
		[
			activeTool,
			currentTime,
			isPlaying,
			modKey,
			setActiveTool,
			setCurrentTime,
			setIsPlaying,
			setShowCommandPalette,
		],
	);

	// Fuzzy filter commands
	const filteredCommands = useMemo(() => {
		if (!query.trim()) {
			// Show recent commands first, then all
			const recent = recentCommands
				.map((id) => commands.find((c) => c.id === id))
				.filter(Boolean) as PaletteCommand[];
			const rest = commands.filter(
				(c) => !recentCommands.includes(c.id),
			);
			return [...recent, ...rest];
		}

		const scored = commands
			.map((cmd) => ({
				cmd,
				score:
					fuzzyMatch(
						query,
						`${cmd.label} ${cmd.description} ${cmd.keywords.join(" ")}`,
					) +
					(cmd.category.toLowerCase().includes(query.toLowerCase())
						? 50
						: 0),
			}))
			.filter((s) => s.score > 0)
			.sort((a, b) => b.score - a.score);

		return scored.map((s) => s.cmd);
	}, [query, commands, recentCommands]);

	// Group filtered commands by category
	const grouped = useMemo(() => {
		const groups = new Map<string, PaletteCommand[]>();
		for (const cmd of filteredCommands) {
			const existing = groups.get(cmd.category) ?? [];
			existing.push(cmd);
			groups.set(cmd.category, existing);
		}
		return Array.from(groups.entries());
	}, [filteredCommands]);

	// Reset selection when query changes
	useEffect(() => {
		/* eslint-disable react-hooks/set-state-in-effect */
		setSelectedIdx(0);
	}, [query]);

	// Focus input on open
	useEffect(() => {
		/* eslint-disable react-hooks/set-state-in-effect */
		if (showCommandPalette) {
			setQuery("");
			// Small delay to ensure the DOM is ready
			requestAnimationFrame(() => {
				inputRef.current?.focus();
			});
		}
	}, [showCommandPalette]);

	// Global Cmd+K / Ctrl+K listener
	useEffect(() => {
		const handleGlobalKey = (e: KeyboardEvent) => {
			const isMod = e.metaKey || e.ctrlKey;
			if (
				isMod &&
				(e.key === "k" || e.key === "K") &&
				!showCommandPalette
			) {
				e.preventDefault();
				setShowCommandPalette(true);
			}
			if (e.key === "Escape" && showCommandPalette) {
				setShowCommandPalette(false);
			}
		};

		window.addEventListener("keydown", handleGlobalKey);
		return () => window.removeEventListener("keydown", handleGlobalKey);
	}, [showCommandPalette, setShowCommandPalette]);

	const executeCommand = useCallback(
		(cmd: PaletteCommand) => {
			setRecentCommands((prev) => {
				const next = [cmd.id, ...prev.filter((id) => id !== cmd.id)];
				return next.slice(0, 5);
			});
			cmd.action();
			setShowCommandPalette(false);
		},
		[setShowCommandPalette],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedIdx((prev) =>
					Math.min(prev + 1, filteredCommands.length - 1),
				);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedIdx((prev) => Math.max(prev - 1, 0));
			} else if (e.key === "Enter") {
				e.preventDefault();
				const cmd = filteredCommands[selectedIdx];
				if (cmd) executeCommand(cmd);
			} else if (e.key === "Escape") {
				setShowCommandPalette(false);
			}
		},
		[filteredCommands, selectedIdx, executeCommand, setShowCommandPalette],
	);

	if (!showCommandPalette) return null;

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 z-200 bg-black/60 backdrop-blur-sm"
				onClick={() => setShowCommandPalette(false)}
				onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
				role="button"
				tabIndex={0}
				aria-label="Close command palette"
			/>

			{/* Palette */}
			<div className="fixed top-[15%] left-1/2 -translate-x-1/2 z-250 w-full max-w-lg">
				<div
					className="bg-popover border border-border rounded-xl shadow-2xl overflow-hidden"
					role="dialog"
					aria-label="Command Palette"
				>
					{/* Search input */}
					<div className="flex items-center gap-3 px-4 py-3 border-b border-border">
						<Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
						<input
							ref={inputRef}
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Search commands..."
							className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
						/>
						<kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-accent border border-border rounded">
							<Command className="w-3 h-3" />K
						</kbd>
					</div>

					{/* Results */}
					<div className="max-h-72 overflow-y-auto p-1">
						{filteredCommands.length === 0 && query.trim() !== "" && (
							<div className="flex flex-col items-center justify-center py-10 px-4">
								<Search className="w-8 h-8 text-muted-foreground/30 mb-3" />
								<p className="text-sm text-muted">
									No commands found
								</p>
								<p className="text-xs text-muted/50 mt-1">
									Try a different search term
								</p>
							</div>
						)}

						{filteredCommands.length === 0 && query.trim() === "" && (
							<div className="flex flex-col items-center justify-center py-10 px-4">
								<Command className="w-8 h-8 text-muted-foreground/30 mb-3" />
								<p className="text-sm text-muted">
									Type to search commands
								</p>
								<p className="text-xs text-muted/50 mt-1">
									Use arrow keys to navigate, Enter to
									select
								</p>
							</div>
						)}

						{grouped.map(([category, cmds]) => (
							<div key={category} className="mb-1">
								<div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
									{category}
								</div>
								{cmds.map((cmd) => {
									const globalIdx =
										filteredCommands.indexOf(cmd);
									const isSelected =
										globalIdx === selectedIdx;
									return (
										<button
											key={cmd.id}
											onClick={() =>
												executeCommand(cmd)
											}
											onMouseEnter={() =>
												setSelectedIdx(globalIdx)
											}
											className={cn(
												"w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-md transition-colors",
												isSelected
													? "bg-accent"
													: "hover:bg-accent/50",
											)}
										>
											<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
												<cmd.icon className="w-4 h-4 text-foreground/70" />
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<span className="text-sm font-medium text-foreground truncate">
														{cmd.label}
													</span>
													{recentCommands.includes(
														cmd.id,
													) && (
														<span className="flex items-center gap-1 text-[10px] text-cyan-400/80 flex-shrink-0">
															<Clock className="w-3 h-3" />
															Recent
														</span>
													)}
												</div>
												<p className="text-[11px] text-muted-foreground/70 truncate">
													{cmd.description}
												</p>
											</div>
											{cmd.shortcut && (
												<kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-background border border-border rounded flex-shrink-0">
													{cmd.shortcut}
												</kbd>
											)}
										</button>
									);
								})}
							</div>
						))}
					</div>

					{/* Footer */}
					<div className="flex items-center gap-4 px-4 py-2 border-t border-border text-[10px] text-muted-foreground/60">
						<span className="flex items-center gap-1">
							<kbd className="px-1 py-0.5 bg-accent border border-border rounded text-[9px]">
								↑↓
							</kbd>{" "}
							Navigate
						</span>
						<span className="flex items-center gap-1">
							<kbd className="px-1 py-0.5 bg-accent border border-border rounded text-[9px]">
								Enter
							</kbd>{" "}
							Execute
						</span>
						<span className="flex items-center gap-1">
							<kbd className="px-1 py-0.5 bg-accent border border-border rounded text-[9px]">
								Esc
							</kbd>{" "}
							Dismiss
						</span>
					</div>
				</div>
			</div>
		</>
	);
}
