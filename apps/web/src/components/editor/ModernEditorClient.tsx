"use client";

import React, { useState, useEffect } from "react";
import {
	Send,
	Bot,
	User,
	Loader2,
	Video,
	Settings,
	Play,
	Rewind,
	FastForward,
	Scissors,
	Type,
	Layers,
	Pause,
} from "lucide-react";
import { useEditorState } from "./useEditorState";
import WasmPlayer from "./wasm-player";
import Timeline from "./timeline";
import { toast } from "sonner";

export default function ModernEditorClient({ project }: { project: any }) {
	const { projectData: ctxProject, isPlaying, setIsPlaying } = useEditorState();
	const [prompt, setPrompt] = useState("");
	const [chat, setChat] = useState<
		{ role: "user" | "agent"; content: string; videoUrl?: string }[]
	>([
		{
			role: "agent",
			content:
				"I am Chronos, your Autonomous Copilot. What are we building today?",
		},
	]);
	const [isProcessing, setIsProcessing] = useState(false);

	// Fallback to passed project if context not ready
	const activeProject = ctxProject || project;

	const handleSend = async () => {
		if (!prompt.trim()) return;

		const newChat = [...chat, { role: "user" as const, content: prompt }];
		setChat(newChat);
		setPrompt("");
		setIsProcessing(true);

		try {
			const response = await fetch("/api/ai/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt, type: "video" }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "AI generation failed");
			}

			const data = await response.json();

			setChat([
				...newChat,
				{
					role: "agent",
					content: `I generated a ${data.type} clip from your prompt. It has been added to the Media Pool — you can drag it onto the timeline.`,
					videoUrl: data.url,
				},
			]);
			toast.success("AI Edit Applied!");
		} catch (error: any) {
			setChat([
				...newChat,
				{
					role: "agent",
					content: `I encountered an issue: ${error.message}. Please try again or check your AI credits.`,
				},
			]);
			toast.error(error.message || "AI generation failed");
		} finally {
			setIsProcessing(false);
		}
	};

	const togglePlayback = () => {
		setIsPlaying(!isPlaying);
	};

	return (
		<div className="min-h-screen flex flex-col font-sans relative overflow-hidden bg-transparent w-full">
			{/* Main Workspace */}
			<main className="flex-1 flex gap-4 p-4 overflow-hidden h-[calc(100vh-73px)] w-full">
				{/* Left Toolbar */}
				<aside className="w-16 glass-panel flex flex-col items-center py-6 gap-6 h-full shadow-2xl shrink-0">
					<button className="p-3 rounded-xl hover:bg-glass text-foreground/70 hover:text-cyan-400 transition-all">
						<Scissors className="w-6 h-6" />
					</button>
					<button className="p-3 rounded-xl hover:bg-glass text-foreground/70 hover:text-cyan-400 transition-all">
						<Type className="w-6 h-6" />
					</button>
					<button className="p-3 rounded-xl hover:bg-glass text-foreground/70 hover:text-cyan-400 transition-all">
						<Layers className="w-6 h-6" />
					</button>
				</aside>

				<div className="flex-1 flex flex-col gap-4 min-w-0 h-full">
					{/* Top Viewport */}
					<div className="flex-1 glass-panel relative overflow-hidden flex items-center justify-center bg-background/40 shadow-2xl group min-h-[400px]">
						{/* WASM Video Player Component */}
						<div className="w-full h-full relative flex items-center justify-center">
							<WasmPlayer project={activeProject} frame={0} />
						</div>

						{/* Floating Playback Controls */}
						<div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-panel px-6 py-3 rounded-full flex items-center gap-6 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-2xl bg-background/60 backdrop-blur-md border border-border">
							<button className="text-foreground/70 hover:text-foreground transition-colors">
								<Rewind className="w-5 h-5 fill-current" />
							</button>
							<button
								onClick={togglePlayback}
								className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.4)]"
							>
								{isPlaying ? (
									<Pause className="w-5 h-5 fill-current" />
								) : (
									<Play className="w-5 h-5 fill-current ml-1" />
								)}
							</button>
							<button className="text-foreground/70 hover:text-foreground transition-colors">
								<FastForward className="w-5 h-5 fill-current" />
							</button>
						</div>
					</div>

					{/* Timeline Wrapper */}
					<div className="h-72 glass-panel flex flex-col shadow-2xl overflow-hidden relative shrink-0">
						{/* Actual Timeline Component */}
						<div className="flex-1 relative w-full h-full overflow-hidden">
							<Timeline
								project={activeProject}
								frame={0}
								onChangeFrame={() => {}}
								onProjectUpdate={() => {}}
								onCommitUpdate={() => {}}
								selectedClipId={null}
							/>
						</div>
					</div>
				</div>

				{/* Right Copilot Panel */}
				<aside className="w-96 glass-panel flex flex-col shadow-2xl relative overflow-hidden shrink-0">
					<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
					<div className="p-5 border-b border-border flex items-center gap-3">
						<Bot className="w-6 h-6 text-cyan-400" />
						<h2 className="font-display font-bold text-lg">Chronos Copilot</h2>
					</div>

					<div className="flex-1 overflow-y-auto p-5 space-y-6">
						{chat.map((msg, idx) => (
							<div
								key={idx}
								className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
							>
								<div
									className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "agent" ? "bg-cyan-500/20" : "bg-glass"}`}
								>
									{msg.role === "agent" ? (
										<Bot className="w-4 h-4 text-cyan-400" />
									) : (
										<User className="w-4 h-4 text-foreground/60" />
									)}
								</div>
								<div
									className={`text-sm leading-relaxed p-4 rounded-2xl ${msg.role === "user" ? "bg-glass text-foreground rounded-tr-none" : "bg-background/40 text-foreground/80 border border-border rounded-tl-none shadow-inner"}`}
								>
									<p>{msg.content}</p>
								</div>
							</div>
						))}
						{isProcessing && (
							<div className="flex gap-4">
								<div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
									<Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
								</div>
								<div className="bg-background/40 border border-border rounded-2xl p-4 text-sm text-foreground/50 rounded-tl-none">
									Orchestrating timeline edits...
								</div>
							</div>
						)}
					</div>

					<div className="p-4 border-t border-border bg-background/20">
						<div className="relative flex items-center">
							<input
								type="text"
								value={prompt}
								onChange={(e) => setPrompt(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleSend()}
								placeholder="Message Chronos..."
								className="w-full bg-hover border border-border rounded-full py-3 pl-5 pr-12 text-sm text-foreground focus:outline-none focus:border-cyan-500/50 focus:bg-glass transition-all backdrop-blur-md"
							/>
							<button
								onClick={handleSend}
								disabled={!prompt.trim() || isProcessing}
								className="absolute right-2 w-8 h-8 bg-cyan-400 text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_15px_rgba(0,212,223,0.4)]"
							>
								<Send className="w-4 h-4 ml-0.5" />
							</button>
						</div>
					</div>
				</aside>
			</main>
		</div>
	);
}
