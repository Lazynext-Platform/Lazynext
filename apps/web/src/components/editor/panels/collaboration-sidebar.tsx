/**
 * Collaboration sidebar — messaging, review/approval workflow,
 * and team communication panel.
 *
 * @module components/editor/panels/collaboration-sidebar
 */

import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";

/** React component rendering CollaborationSidebar. */
export function CollaborationSidebar({
	currentFrame,
	onNavigateToFrame,
}: {
	currentFrame: number;
	onNavigateToFrame: (f: number) => void;
}) {
	const [comments, setComments] = useState([
		{
			id: "1",
			frame: 120,
			author: "Alice (Director)",
			text: "Can we punch in on this shot? It feels a bit wide.",
			status: "pending",
			avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
		},
		{
			id: "2",
			frame: 345,
			author: "Bob (Colorist)",
			text: "Added the Teal & Orange LUT you asked for.",
			status: "approved",
			avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
		},
		{
			id: "3",
			frame: 500,
			author: "Charlie (Client)",
			text: "Please remove the competitor logo in the background.",
			status: "needs-work",
			avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
		},
	]);

	const [newComment, setNewComment] = useState("");

	const handleAddComment = () => {
		if (!newComment.trim()) return;
		setComments([
			...comments,
			{
				id: Date.now().toString(),
				frame: currentFrame,
				author: "You",
				text: newComment,
				status: "pending",
				avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
			},
		]);
		setNewComment("");
	};

	const getStatusColor = (status: string) => {
		if (status === "approved")
			return "text-emerald-400 bg-emerald-400/10 border-emerald-500/20";
		if (status === "needs-work")
			return "text-orange-400 bg-orange-400/10 border-orange-500/20";
		return "text-muted bg-panel border-border";
	};

	return (
		<div className="w-80 h-full bg-background border-l border-border flex flex-col z-[100] shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
			<div className="h-10 border-b border-border flex items-center px-4 bg-background justify-between">
				<div className="flex items-center gap-2">
					<MessageSquare className="w-4 h-4 text-blue-400" />
					<span className="text-xs font-bold text-foreground">
						Review & Approval
					</span>
				</div>
				<div className="flex gap-1">
					<span
						className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_lime]"
						title="Live Sync Active"
					></span>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-3">
				{comments
					.sort((a, b) => a.frame - b.frame)
					.map((c) => (
					<div
						key={c.id}
						className="bg-background border border-border rounded-lg p-3 hover:border-zinc-600 transition-colors cursor-pointer group"
						onClick={() => onNavigateToFrame(c.frame)}
						onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
						role="button"
						tabIndex={0}
					>
							<div className="flex justify-between items-start mb-2">
								<div className="flex items-center gap-2">
								{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={c.avatar}
										alt="avatar"
										className="w-6 h-6 rounded-full bg-panel"
									/>
									<span className="text-[10px] font-bold text-foreground">
										{c.author}
									</span>
								</div>
								<span className="text-[9px] font-mono text-muted bg-background px-1.5 py-0.5 rounded border border-border group-hover:text-blue-400 group-hover:border-blue-500/50 transition-colors">
									{Math.floor(c.frame / 60)}:
									{(c.frame % 60).toString().padStart(2, "0")}
								</span>
							</div>
							<p className="text-xs text-muted mb-3">{c.text}</p>
							<div className="flex gap-2">
								<span
									className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${getStatusColor(c.status)}`}
								>
									{c.status.replace("-", " ")}
								</span>
							</div>
						</div>
					))}
			</div>

			<div className="p-3 border-t border-border bg-background">
				<div className="flex items-center justify-between mb-2">
					<span className="text-[10px] font-mono text-muted">
						Current Frame: {currentFrame}
					</span>
				</div>
				<div className="relative">
					<textarea
						value={newComment}
						onChange={(e) => setNewComment(e.target.value)}
						placeholder="Add a comment at this exact frame..."
						className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground placeholder-zinc-600 resize-none h-20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
					/>
					<button
						onClick={handleAddComment}
						disabled={!newComment.trim()}
						className="absolute bottom-2 right-2 p-1.5 bg-blue-600 text-foreground rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
					>
						<Send className="w-3 h-3" />
					</button>
				</div>
			</div>
		</div>
	);
}
