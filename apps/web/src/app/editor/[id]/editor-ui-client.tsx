/**
 * Editor UI client wrapper — composite the header, ModernEditorClient,
 * CommandPalette, QuickActions FAB, and keyboard shortcut hints
 * into a single client component inside EditorStateProvider.
 *
 * Must be a client component because it uses useEditorState hook
 * from the EditorStateProvider context.
 *
 * @module app/editor/[id]/editor-ui-client
 */

"use client";

import ModernEditorClient from "@/components/editor/ModernEditorClient";
import { MobileGate } from "@/components/editor/mobile-gate";
import { CommandPalette } from "@/components/editor/CommandPalette";
import { QuickActions } from "@/components/editor/QuickActions";
import { KeyboardShortcutHints } from "@/components/editor/KeyboardShortcutHints";
import { AutoSaveIndicator } from "@/components/editor/AutoSaveIndicator";
import { ShareButton } from "@/components/editor/ShareButton";
import { useEditorState } from "@/components/editor/useEditorState";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

interface EditorUIClientProps {
	/** Serialized project data. */
	project: Record<string, unknown>;
	/** Project identifier. */
	projectId: string;
	/** Project display name. */
	projectName: string;
}

export function EditorUIClient({ project, projectId, projectName }: EditorUIClientProps) {
	const { setShowCommandPalette } = useEditorState();

	const handleExport = () => {
		setShowCommandPalette(true);
		toast.success("Export", {
			description: "Use the command palette to configure and export your project",
		});
	};

	const handleAddText = () => {
		setShowCommandPalette(true);
		toast("Add Text", {
			description: "Use the command palette or AI prompt to add text overlays",
		});
	};

	const handleAddTransition = () => {
		setShowCommandPalette(true);
		toast("Add Transition", {
			description: "Use the command palette or AI to apply transitions between clips",
		});
	};

	return (
		<MobileGate>
		<>
			{/* Header */}
			<header className="flex h-14 w-full items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-6 shadow-sm z-50 shrink-0">
				<div className="flex items-center gap-4">
					<span className="font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
						Lazynext
					</span>
					<div className="h-4 w-px bg-glass" />
					<span className="text-sm font-medium text-foreground">
						{projectName}
					</span>
				</div>
				<div className="flex items-center gap-3">
					<AutoSaveIndicator />
					<ShareButton projectId={projectId} />
					<button
						onClick={() => setShowCommandPalette(true)}
						className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-foreground/60 hover:text-foreground transition-colors"
						title="Command Palette (Cmd+K)"
					>
						<Sparkles className="w-3.5 h-3.5" />
						<span className="hidden sm:inline">Cmd+K</span>
					</button>
				</div>
			</header>

			{/* Main Body */}
			<div className="flex flex-1 overflow-hidden relative">
				<div className="absolute inset-0 z-0 bg-[url('/noise.png')] opacity-5 pointer-events-none" />
				<div className="relative z-10 flex flex-1 w-full h-full">
					<ModernEditorClient project={project} />
				</div>

				{/* Quick Actions FAB — bottom-right corner */}
				<div className="absolute bottom-6 right-6 z-50">
					<QuickActions
						onAiEdit={() => setShowCommandPalette(true)}
						onExport={handleExport}
						onAddText={handleAddText}
						onAddTransition={handleAddTransition}
					/>
				</div>
			</div>

			{/* Command Palette — global Cmd+K overlay */}
			<CommandPalette />

			{/* Keyboard Shortcut Hints — toggle with "/" key */}
			<KeyboardShortcutHints />
		</>
		</MobileGate>
	);
}
