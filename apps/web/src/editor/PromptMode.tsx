/**
 * Spotlight-style command interface for the Lazynext AI Agent Copilot.
 *
 * Renders a full-screen glassmorphic overlay with a text prompt,
 * suggestion chips, and a live WGPU preview canvas. Submitted
 * intents are dispatched to the editor's AI pipeline.
 *
 * @module editor/PromptMode
 */

import React, { useState, useEffect } from "react";
import { useEditor } from "./use-editor";
import { Bot, Sparkles, Command } from "lucide-react";

/**
 * Premium command interface for conversing with the Lazynext AI Agent Copilot.
 *
 * A full-screen glassmorphic overlay (activated via Cmd+K) that accepts
 * natural-language editing intents and previews the live editor canvas
 * while the AI agent processes the request.
 */
export const PromptMode: React.FC = () => {
	const { sendIntent, isAgentThinking } = useEditor();
	const [prompt, setPrompt] = useState("");
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (prompt.trim() === "" || isAgentThinking) return;

		sendIntent(prompt);
		setPrompt("");
	};

	return (
		<div
			className={`absolute inset-0 z-50 flex items-start justify-center pt-[15vh] transition-all duration-500 ${isMounted ? "bg-black/60 backdrop-blur-xl opacity-100" : "bg-transparent backdrop-blur-none opacity-0"}`}
		>
			<div
				className={`w-full max-w-3xl transform transition-all duration-500 ${isMounted ? "translate-y-0 scale-100 opacity-100" : "-translate-y-8 scale-95 opacity-0"}`}
			>
				{/* Glow effect behind the modal */}
				<div
					className={`absolute -inset-1 rounded-2xl blur-xl opacity-30 transition-all duration-1000 ${isAgentThinking ? "bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 animate-pulse" : "bg-white/10"}`}
				></div>

				<div className="relative bg-black/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
					{/* Live Background Render Canvas (WGPU WebGL context) */}
					<canvas
						id="prompt-preview-canvas"
						className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${isAgentThinking ? "opacity-30" : "opacity-0"}`}
					/>

					{/* Top Header */}
					<div className="relative z-10 px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,212,223,0.4)]">
								<Bot className="w-4 h-4 text-white" />
							</div>
							<span className="text-white font-medium tracking-wide">
								Lazynext AI Agent Copilot
							</span>
						</div>
						<div className="flex items-center gap-2 text-xs text-white/40 font-mono">
							<Command className="w-3 h-3" /> + K
						</div>
					</div>

					<form onSubmit={handleSubmit} className="relative z-10 p-6">
						<div className="relative flex items-center">
							<input
								type="text"
								value={prompt}
								onChange={(e) => setPrompt(e.target.value)}
								placeholder="Ask Lazynext AI Agent to edit, cut, or style..."
								className="w-full bg-transparent text-2xl text-white placeholder:text-white/20 focus:outline-none"
								disabled={isAgentThinking}
								// eslint-disable-next-line jsx-a11y/no-autofocus
								autoFocus
							/>
						</div>

						{/* The laser scanning effect when thinking */}
						<div className="absolute bottom-0 left-0 h-[2px] w-full bg-white/5 overflow-hidden">
							{isAgentThinking && (
								<div className="h-full w-1/3 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[slide_1.5s_ease-in-out_infinite]"></div>
							)}
						</div>
					</form>

					{/* Suggestions Footer */}
					<div className="relative z-10 px-6 py-4 bg-black/40 border-t border-white/5">
						<div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
							<span className="text-xs text-white/40 uppercase tracking-wider font-semibold shrink-0">
								Try
							</span>
							{[
								{
									label: "Vertical Cut for Reels",
									icon: "📱",
									action: "Make a 9:16 vertical cut for Reels",
								},
								{
									label: "Add Cinematic Captions",
									icon: "✨",
									action: "Add dynamic MSDF captions",
								},
								{
									label: "Sweep Silence",
									icon: "✂️",
									action: "Remove all silent gaps",
								},
							].map((s, i) => (
								<button
									key={i}
									type="button"
									onClick={() => setPrompt(s.action)}
									className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-sm text-white/70 transition-all shrink-0 group"
									disabled={isAgentThinking}
								>
									<span className="opacity-70 group-hover:opacity-100">
										{s.icon}
									</span>
									{s.label}
								</button>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* Inline styles for the custom animation since we don't have tailwind.config.js handy */}
			<style>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
		</div>
	);
};
