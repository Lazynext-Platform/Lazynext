/**
 * Keyboard shortcut hints overlay — displays contextual keyboard
 * shortcuts for the editor (Space=play, J/K/L=shuttle, I/O=in/out).
 * Shown momentarily on first load, toggleable via "?" key.
 *
 * @module components/editor/KeyboardShortcutHints
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/utils/ui";

interface ShortcutHint {
	/** Human-readable action label. */
	label: string;
	/** Key combination strings. */
	keys: string[];
	/** Shortcut category for grouping. */
	category: "Playback" | "Timeline" | "Edit" | "Navigation";
}

const SHORTCUTS: ShortcutHint[] = [
	// Playback
	{ label: "Play / Pause", keys: ["Space"], category: "Playback" },
	{ label: "Shuttle Left", keys: ["J"], category: "Playback" },
	{ label: "Shuttle Stop", keys: ["K"], category: "Playback" },
	{ label: "Shuttle Right", keys: ["L"], category: "Playback" },
	{ label: "Go to Start", keys: ["Home"], category: "Playback" },
	{ label: "Go to End", keys: ["End"], category: "Playback" },
	// Timeline
	{ label: "Mark In Point", keys: ["I"], category: "Timeline" },
	{ label: "Mark Out Point", keys: ["O"], category: "Timeline" },
	{ label: "Zoom In Timeline", keys: ["="], category: "Timeline" },
	{ label: "Zoom Out Timeline", keys: ["-"], category: "Timeline" },
	{ label: "Add Marker", keys: ["M"], category: "Timeline" },
	// Edit
	{ label: "Razor / Cut", keys: ["B"], category: "Edit" },
	{ label: "Select Tool", keys: ["V"], category: "Edit" },
	{ label: "Delete Selected", keys: ["Del"], category: "Edit" },
	{ label: "Undo", keys: ["Cmd", "Z"], category: "Edit" },
	{ label: "Redo", keys: ["Cmd", "Shift", "Z"], category: "Edit" },
	{ label: "Copy", keys: ["Cmd", "C"], category: "Edit" },
	{ label: "Paste", keys: ["Cmd", "V"], category: "Edit" },
	// Navigation
	{ label: "Command Palette", keys: ["Cmd", "K"], category: "Navigation" },
	{ label: "Frame Forward", keys: ["→"], category: "Navigation" },
	{ label: "Frame Back", keys: ["←"], category: "Navigation" },
	{ label: "Jump 10s Forward", keys: ["Shift", "→"], category: "Navigation" },
	{ label: "Jump 10s Back", keys: ["Shift", "←"], category: "Navigation" },
];

export function KeyboardShortcutHints() {
	const [isVisible, setIsVisible] = useState(false);

	const toggle = useCallback(() => {
		setIsVisible((prev) => !prev);
	}, []);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			// Toggle on "?" (without modifier)
			if (
				e.key === "/" &&
				!e.metaKey &&
				!e.ctrlKey &&
				!e.altKey &&
				!e.shiftKey &&
				document.activeElement?.tagName !== "INPUT" &&
				document.activeElement?.tagName !== "TEXTAREA"
			) {
				e.preventDefault();
				toggle();
			}

			// Close on Escape
			if (e.key === "Escape" && isVisible) {
				setIsVisible(false);
			}
		};

		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [isVisible, toggle]);

	const categories = Array.from(
		new Set(SHORTCUTS.map((s) => s.category)),
	);

	return (
		<AnimatePresence>
			{isVisible && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-200 bg-black/40 backdrop-blur-sm"
						onClick={() => setIsVisible(false)}
					/>

					{/* Overlay */}
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 20 }}
						transition={{
							type: "spring" as const,
							stiffness: 400,
							damping: 30,
						}}
						className="fixed top-[10%] left-1/2 -translate-x-1/2 z-250 w-full max-w-md"
					>
						<div className="bg-popover border border-border rounded-xl shadow-2xl overflow-hidden">
							{/* Header */}
							<div className="flex items-center justify-between px-5 py-3 border-b border-border">
								<div>
									<h2 className="text-sm font-bold text-foreground">
										Keyboard Shortcuts
									</h2>
									<p className="text-[10px] text-muted-foreground mt-0.5">
										Press <kbd className="px-1 py-0.5 text-[9px] font-mono bg-accent border border-border rounded">/</kbd>{" "}
										to toggle anytime
									</p>
								</div>
								<button
									onClick={() => setIsVisible(false)}
									className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
								>
									<X className="w-4 h-4" />
								</button>
							</div>

							{/* Content */}
							<div className="max-h-[50vh] overflow-y-auto p-3">
								{categories.map((category) => (
									<div key={category} className="mb-3">
										<h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
											{category}
										</h3>
										<div className="space-y-0.5">
											{SHORTCUTS.filter(
												(s) => s.category === category,
											).map((shortcut) => (
												<div
													key={shortcut.label}
													className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent/50"
												>
													<span className="text-xs text-foreground/80">
														{shortcut.label}
													</span>
													<div className="flex items-center gap-1">
														{shortcut.keys.map(
															(key, idx) => (
																<span key={idx}>
																	<kbd
																		className={cn(
																			"inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-background border border-border rounded min-w-[22px]",
																		)}
																	>
																		{key}
																	</kbd>
																	{idx <
																		shortcut
																			.keys
																			.length -
																			1 && (
																		<span className="text-[10px] text-muted-foreground/40 mx-0.5">
																			+
																		</span>
																	)}
																</span>
															),
														)}
													</div>
												</div>
											))}
										</div>
									</div>
								))}
							</div>

							{/* Footer */}
							<div className="px-4 py-2 border-t border-border text-[10px] text-muted-foreground/50 text-center">
								Tip: Try <kbd className="px-1 py-0.5 text-[9px] font-mono bg-accent border border-border rounded">Cmd+K</kbd>{" "}
								for the command palette
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}
