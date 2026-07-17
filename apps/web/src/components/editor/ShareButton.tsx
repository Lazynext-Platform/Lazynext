/**
 * Share button — generates a shareable link to the current project.
 * Shows Copy to clipboard with toast confirmation.
 *
 * @module components/editor/ShareButton
 */

"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { cn } from "@/utils/ui";
import { toast } from "sonner";

interface ShareButtonProps {
	/** ID of the project to share. */
	projectId: string;
	/** Additional CSS class names. */
	className?: string;
}

/** React component rendering ShareButton. */
export function ShareButton({ projectId, className }: ShareButtonProps) {
	const [isSharing, setIsSharing] = useState(false);
	const [isCopied, setIsCopied] = useState(false);

	const handleShare = async () => {
		if (isSharing || !projectId) return;
		setIsSharing(true);

		try {
			// Generate a shareable link
			const link = `${window.location.origin}/editor/${projectId}`;
			await navigator.clipboard.writeText(link);

			setIsCopied(true);
			toast.success("Share link copied!", {
				description: "Send this link to collaborate on this project.",
			});

			setTimeout(() => setIsCopied(false), 2000);
		} catch {
			// Fallback for older browsers
			const link = `${window.location.origin}/editor/${projectId}`;

			try {
				const textarea = document.createElement("textarea");
				textarea.value = link;
				textarea.style.position = "fixed";
				textarea.style.opacity = "0";
				document.body.appendChild(textarea);
				textarea.select();
				document.execCommand("copy");
				document.body.removeChild(textarea);

				setIsCopied(true);
				toast.success("Share link copied!");
				setTimeout(() => setIsCopied(false), 2000);
			} catch {
				toast.error("Failed to copy link", {
					description: "Please try again or copy the URL manually.",
				});
			}
		} finally {
			setIsSharing(false);
		}
	};

	return (
		<button
			onClick={handleShare}
			disabled={isSharing}
			className={cn(
				"flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-glass hover:bg-white/10 text-foreground/70 hover:text-foreground transition-colors disabled:opacity-50",
				isCopied &&
					"border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
				className,
			)}
			title="Copy share link"
		>
			{isCopied ? (
				<>
					<Check className="w-3.5 h-3.5" />
					<span>Copied!</span>
				</>
			) : (
				<>
					<Share2 className="w-3.5 h-3.5" />
					<span>Share</span>
				</>
			)}
		</button>
	);
}
