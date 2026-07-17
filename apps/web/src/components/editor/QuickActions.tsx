/**
 * Quick Actions floating button (FAB) — provides fast access to
 * AI Edit, Export, Add Text, and Add Transition from anywhere in
 * the editor.
 *
 * @module components/editor/QuickActions
 */

"use client";

import React, { useState } from "react";
import {
	Wand2,
	Download,
	Type,
	Layers,
	Plus,
	X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/ui";

interface QuickAction {
	/** Unique action identifier. */
	id: string;
	/** Display label. */
	label: string;
	/** Lucide icon component. */
	icon: React.ElementType;
	/** Keyboard shortcut hint. */
	shortcut?: string;
	/** Tailwind color classes. */
	color: string;
	/** Click handler. */
	action: () => void;
}

interface QuickActionsProps {
	/** Handler for AI Edit action. */
	onAiEdit?: () => void;
	/** Handler for Export action. */
	onExport?: () => void;
	/** Handler for Add Text action. */
	onAddText?: () => void;
	/** Handler for Add Transition action. */
	onAddTransition?: () => void;
	/** Additional CSS classes. */
	className?: string;
}

/** React component rendering QuickActions. */
export function QuickActions({
	onAiEdit,
	onExport,
	onAddText,
	onAddTransition,
	className,
}: QuickActionsProps) {
	const [isOpen, setIsOpen] = useState(false);

	const actions: QuickAction[] = [
		{
			id: "ai-edit",
			label: "AI Edit",
			icon: Wand2,
			shortcut: "Cmd+K",
			color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20",
			action: () => {
				setIsOpen(false);
				onAiEdit?.();
			},
		},
		{
			id: "export",
			label: "Export",
			icon: Download,
			shortcut: "Cmd+E",
			color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20",
			action: () => {
				setIsOpen(false);
				onExport?.();
			},
		},
		{
			id: "add-text",
			label: "Add Text",
			icon: Type,
			shortcut: "T",
			color: "text-purple-400 bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20",
			action: () => {
				setIsOpen(false);
				onAddText?.();
			},
		},
		{
			id: "add-transition",
			label: "Add Transition",
			icon: Layers,
			color: "text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20",
			action: () => {
				setIsOpen(false);
				onAddTransition?.();
			},
		},
	];

	return (
		<div className={cn("relative", className)}>
			{/* Backdrop */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-40 bg-glass"
						onClick={() => setIsOpen(false)}
					/>
				)}
			</AnimatePresence>

			{/* Action buttons */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, scale: 0.8, y: 10 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.8, y: 10 }}
						transition={{ type: "spring" as const, stiffness: 500, damping: 30 }}
						className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 flex flex-col gap-2 z-50"
					>
						{actions.map((action, idx) => (
							<motion.button
								key={action.id}
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -20 }}
								transition={{ delay: idx * 0.05 }}
								onClick={action.action}
								className={cn(
									"flex items-center gap-3 px-4 py-2.5 rounded-xl border backdrop-blur-xl shadow-lg transition-colors whitespace-nowrap",
									action.color,
								)}
							>
								<action.icon className="w-4 h-4" />
								<span className="text-sm font-medium text-foreground/90">
									{action.label}
								</span>
								{action.shortcut && (
									<kbd className="text-[10px] text-muted-foreground/50 ml-2 font-mono">
										{action.shortcut}
									</kbd>
								)}
							</motion.button>
						))}
					</motion.div>
				)}
			</AnimatePresence>

			{/* FAB Toggle */}
			<motion.button
				whileHover={{ scale: 1.05 }}
				whileTap={{ scale: 0.95 }}
				onClick={() => setIsOpen(!isOpen)}
				className={cn(
					"w-12 h-12 rounded-full flex items-center justify-center shadow-lg border transition-colors",
					isOpen
						? "bg-foreground text-background border-foreground"
						: "bg-cyan-500 text-background border-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:bg-cyan-400",
				)}
			>
				{isOpen ? (
					<X className="w-5 h-5" />
				) : (
					<Plus className="w-6 h-6" />
				)}
			</motion.button>
		</div>
	);
}
