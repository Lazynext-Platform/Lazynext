/**
 * Auto-save indicator — shows project save status (Saved, Saving, Offline)
 * in the editor header.
 *
 * @module components/editor/AutoSaveIndicator
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Loader2, WifiOff, CloudOff } from "lucide-react";
import { cn } from "@/utils/ui";

type SaveStatus = "saved" | "saving" | "unsaved" | "offline" | "error";

interface AutoSaveIndicatorProps {
	/** Additional CSS classes. */
	className?: string;
}

export function AutoSaveIndicator({ className }: AutoSaveIndicatorProps) {
	const [status, setStatus] = useState<SaveStatus>("saved");

	const _checkOnline = useCallback(() => {
		if (typeof navigator === "undefined") return true;
		return navigator.onLine;
	}, []);

	useEffect(() => {
		const handleOnline = () => setStatus("saved");
		const handleOffline = () => setStatus("offline");

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		// Listen for custom save events from the editor
		const handleSaving = () => setStatus("saving");
		const handleSaved = () => setStatus("saved");
		const handleSaveError = () => setStatus("error");

		window.addEventListener("lazynext:save-start", handleSaving);
		window.addEventListener("lazynext:save-complete", handleSaved);
		window.addEventListener("lazynext:save-error", handleSaveError);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
			window.removeEventListener("lazynext:save-start", handleSaving);
			window.removeEventListener(
				"lazynext:save-complete",
				handleSaved,
			);
			window.removeEventListener(
				"lazynext:save-error",
				handleSaveError,
			);
		};
	}, []);

	const config: Record<
		SaveStatus,
		{
			label: string;
			icon: React.ElementType;
			bgClass: string;
			textClass: string;
			dotClass: string;
		}
	> = {
		saved: {
			label: "Saved",
			icon: CheckCircle2,
			bgClass: "bg-emerald-500/10",
			textClass: "text-emerald-400",
			dotClass: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]",
		},
		saving: {
			label: "Saving...",
			icon: Loader2,
			bgClass: "bg-cyan-500/10",
			textClass: "text-cyan-400",
			dotClass: "bg-cyan-400 animate-pulse",
		},
		unsaved: {
			label: "Unsaved",
			icon: CloudOff,
			bgClass: "bg-amber-500/10",
			textClass: "text-amber-400",
			dotClass: "bg-amber-400 animate-pulse",
		},
		offline: {
			label: "Offline",
			icon: WifiOff,
			bgClass: "bg-red-500/10",
			textClass: "text-red-400",
			dotClass: "bg-red-400",
		},
		error: {
			label: "Save error",
			icon: CloudOff,
			bgClass: "bg-red-500/10",
			textClass: "text-red-400",
			dotClass: "bg-red-400 animate-pulse",
		},
	};

	const c = config[status];
	const StatusIcon = c.icon;

	return (
		<div
			className={cn(
				"flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/5 text-xs font-medium transition-all",
				c.bgClass,
				c.textClass,
				className,
			)}
			title={`Auto-save: ${c.label}`}
		>
			<div
				className={cn(
					"w-1.5 h-1.5 rounded-full flex-shrink-0",
					c.dotClass,
				)}
			/>
			<span className="hidden sm:inline">{c.label}</span>
			{status === "saving" && (
				<StatusIcon className="w-3 h-3 animate-spin" />
			)}
		</div>
	);
}
