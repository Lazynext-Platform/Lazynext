/**
 * Standalone agentic editor page — canvas preview + Lazynext AI Agent
 * AI chat interface with playback controls.
 *
 * @page /editor
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useWasm } from "@/hooks/use-wasm";
import { wasmBridge } from "@/core/wasm-bridge";
import { QuickActions } from "@/components/editor/QuickActions";
import { KeyboardShortcutHints } from "@/components/editor/KeyboardShortcutHints";
import { AutoSaveIndicator } from "@/components/editor/AutoSaveIndicator";
import { MobileGate } from "@/components/editor/mobile-gate";
import { VoiceInput } from "@/components/editor/VoiceInput";
import {
	Bot,
	Loader2,
	Video,
	Settings,
	Play,
	Pause,
	Rewind,
	FastForward,
	Film,
	Sparkles,
	CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/** React component rendering EditorPage. */
export default function EditorPage() {
	const { isReady, time, frame, projectData: _projectData } = useWasm();
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const [prompt, setPrompt] = useState("");
	const [chat, setChat] = useState<
		{ role: "user" | "agent"; content: string; videoUrl?: string; status?: "planning" | "executing" | "done" }[]
	>([
		{
			role: "agent",
			content:
				"I am Lazynext AI Agent, your Autonomous Copilot. Tell me what you want to create or edit, and I'll handle the rest.",
			status: "done",
		},
	]);
	const [isProcessing, setIsProcessing] = useState(false);
	const chatEndRef = useRef<HTMLDivElement>(null);

	// Auto-scroll chat
	useEffect(() => {
		chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [chat]);

	// Render frame to canvas
	useEffect(() => {
		if (isReady && canvasRef.current) {
			wasmBridge.renderToCanvas(canvasRef.current, frame).catch(() => {
				// Suppress render errors if WASM isn't fully ready
			});
		}
	}, [frame, isReady]);

	const handleSend = async () => {
		if (!prompt.trim() || isProcessing) return;
		if (prompt.trim().length > 50000) return;

		const userMessage = prompt.trim();
		setPrompt("");
		setIsProcessing(true);

		// 1. Add User Message
		setChat(prev => [...prev, { role: "user", content: userMessage }]);
		
		// 2. Add Agent "Planning" state
		setChat(prev => [...prev, { role: "agent", content: "Analyzing your request...", status: "planning" }]);

		// 3. Call the real API Gateway for autonomous editing
		try {
			const res = await fetch("/api/ai/autonomous-edit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					prompt: userMessage,
					require_plan_approval: false,
				}),
			});

			if (res.ok) {
				const data = await res.json();
				setChat(prev => {
					const newChat = [...prev];
					newChat[newChat.length - 1] = {
						role: "agent",
						content: data.message || "Edit complete! Timeline has been updated.",
						status: "done",
					};
					return newChat;
				});
			} else {
				const errData = await res.json().catch(() => ({}));
				setChat(prev => {
					const newChat = [...prev];
					newChat[newChat.length - 1] = {
						role: "agent",
						content: `Error: ${errData.error || "API Gateway returned an error. Ensure it is running on port 8005."}`,
						status: "done",
					};
					return newChat;
				});
			}
		} catch {
			setChat(prev => {
				const newChat = [...prev];
				newChat[newChat.length - 1] = {
					role: "agent",
					content: "Lazynext AI Agent is currently offline. Start the API Gateway (port 8005) to enable AI-powered editing, or use the MCP server for agentic control.",
					status: "done",
				};
				return newChat;
			});
		} finally {
			setIsProcessing(false);
			if (isReady && time) {
				time.play();
			}
		}
	};

	const togglePlayback = () => {
		if (!isReady) return;
		if (time.isPlaying) {
			time.pause();
		} else {
			time.play();
		}
	};

	const handleExport = () => {
		// Export: opens API gateway export via fetch
		const rustGatewayUrl =
			process.env.NEXT_PUBLIC_RUST_API_GATEWAY_URL || "http://127.0.0.1:8005";
		fetch(`${rustGatewayUrl}/api/v1/export`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ format: "mp4" }),
		})
			.then((res) => res.json())
			.then((data) => {
				setChat((prev) => [
					...prev,
					{
						role: "agent" as const,
						content: data.message || "Export job created. Check your render queue.",
						status: "done" as const,
					},
				]);
			})
			.catch(() => {
				setChat((prev) => [
					...prev,
					{
						role: "agent" as const,
						content:
							"Export is currently unavailable. Ensure the API Gateway is running on port 8005.",
						status: "done" as const,
					},
				]);
			});
	};

	return (
		<MobileGate>
		<div className="min-h-screen flex flex-col font-sans relative overflow-hidden bg-background">
			{/* Header */}
			<header className="px-6 py-4 glass-panel border-b-0 rounded-none border-b border-border flex items-center justify-between sticky top-0 z-50">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(0,212,223,0.3)]">
						<Video className="w-5 h-5 text-black" />
					</div>
					<span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
						Lazynext Agent
					</span>
				</div>
				<div className="flex items-center gap-4">
					<AutoSaveIndicator />
					<div className="text-xs text-foreground/40 mr-4 flex items-center gap-2">
						<div className={`w-2 h-2 rounded-full ${isReady ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`}></div>
						Engine {isReady ? "Online" : "Booting..."}
					</div>
					<button className="btn-premium flex items-center gap-2 text-sm">
						<Settings className="w-4 h-4" /> Settings
					</button>
					<button className="btn-primary px-6 py-2">Export Project</button>
				</div>
			</header>

			{/* Main Agent Workspace */}
			<main className="flex-1 flex gap-6 p-6 overflow-hidden h-[calc(100vh-73px)]">
				
				{/* Left Side: Video Preview */}
				<div className="flex-1 flex flex-col gap-4 min-w-0 h-full">
					<div className="flex-1 glass-panel relative overflow-hidden flex items-center justify-center bg-black/40 shadow-2xl group border border-border/50 rounded-3xl">
						{/* Placeholder text if no video yet */}
						{!isReady && (
							<div className="absolute inset-0 flex items-center justify-center text-foreground/30 flex-col gap-4">
								<Film className="w-16 h-16 opacity-50" />
								<p className="font-display tracking-widest uppercase text-sm">Waiting for Agent Intent...</p>
							</div>
						)}
						<canvas
							ref={canvasRef}
							className="w-full h-full object-contain rounded-3xl z-10 relative"
							width={1920}
							height={1080}
						/>

						{/* Floating Playback Controls */}
						<div className="absolute bottom-8 left-1/2 -translate-x-1/2 glass-panel px-8 py-4 rounded-full flex items-center gap-8 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 shadow-2xl hover:scale-105">
							<button
								className="text-foreground/70 hover:text-cyan-400 transition-colors"
								onClick={() => time?.setFrame(Math.max(0, frame - 30))}
							>
								<Rewind className="w-6 h-6 fill-current" />
							</button>
							<button
								onClick={togglePlayback}
								className="w-14 h-14 rounded-full bg-cyan-400 text-black flex items-center justify-center hover:bg-cyan-300 transition-colors shadow-[0_0_20px_rgba(0,229,255,0.4)]"
							>
								{time?.isPlaying ? (
									<Pause className="w-6 h-6 fill-current" />
								) : (
									<Play className="w-6 h-6 fill-current ml-1" />
								)}
							</button>
							<button
								className="text-foreground/70 hover:text-cyan-400 transition-colors"
								onClick={() => time?.setFrame(frame + 30)}
							>
								<FastForward className="w-6 h-6 fill-current" />
							</button>
						</div>
					</div>
				</div>

				{/* Right Side: Copilot Chat Interface */}
				<aside className="w-[450px] glass-panel flex flex-col shadow-2xl relative overflow-hidden rounded-3xl border border-border/50">
					<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 z-10"></div>
					<div className="p-6 border-b border-border/50 flex items-center gap-4 bg-background/50 backdrop-blur-xl">
						<div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
							<Bot className="w-5 h-5 text-cyan-400" />
						</div>
						<div>
							<h2 className="font-display font-bold text-lg text-foreground">Lazynext AI Agent Agent</h2>
							<p className="text-xs text-foreground/50">Autonomous Video Editor</p>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
						<AnimatePresence initial={false}>
							{chat.map((msg, index) => (
								<motion.div
									initial={{ opacity: 0, y: 10, scale: 0.95 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									key={index}
									className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
								>
									<div
										className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-lg ${
											msg.role === "user"
												? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-tr-sm"
												: "bg-glass border border-border/50 text-foreground rounded-tl-sm"
										}`}
									>
										{msg.role === "agent" && msg.status && msg.status !== "done" && (
											<div className="flex items-center gap-2 mb-2 text-cyan-400 font-medium text-xs uppercase tracking-wider">
												<Loader2 className="w-3 h-3 animate-spin" />
												{msg.status}
											</div>
										)}
										{msg.role === "agent" && msg.status === "done" && index > 0 && (
											<div className="flex items-center gap-2 mb-2 text-green-400 font-medium text-xs uppercase tracking-wider">
												<CheckCircle2 className="w-3 h-3" />
												Success
											</div>
										)}
										<p>{msg.content}</p>
									</div>
								</motion.div>
							))}
						</AnimatePresence>
						<div ref={chatEndRef} />
					</div>

					<div className="p-6 border-t border-border/50 bg-background/50 backdrop-blur-xl">
						<div className="flex items-center gap-2">
							<VoiceInput
								onTranscription={(text) => {
									setPrompt((prev) => prev ? prev + " " + text : text);
								}}
							/>
							<div className="relative flex items-center group flex-1">
								<input
									type="text"
									value={prompt}
									onChange={(e) => setPrompt(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleSend()}
									placeholder="e.g. Turn this into 3 viral TikTok clips..."
									className="w-full bg-black/40 border border-border/50 rounded-full py-4 pl-6 pr-14 text-sm text-foreground focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner placeholder:text-foreground/30"
								/>
								<button
									onClick={handleSend}
									disabled={!prompt.trim() || isProcessing}
									className="absolute right-2 w-10 h-10 bg-cyan-400 text-black rounded-full flex items-center justify-center hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_15px_rgba(0,212,223,0.4)] group-focus-within:shadow-[0_0_20px_rgba(0,212,223,0.6)]"
								>
									<Sparkles className="w-5 h-5" />
								</button>
							</div>
						</div>
						<p className="text-center text-[10px] text-foreground/30 mt-3 font-medium uppercase tracking-widest">
							Powered by Livecore API
						</p>
					</div>
				</aside>
			</main>

			{/* Quick Actions FAB */}
			<div className="fixed bottom-6 right-6 z-50">
				<QuickActions
					onExport={handleExport}
				/>
			</div>

			{/* Keyboard Shortcut Hints */}
			<KeyboardShortcutHints />
		</div>
		</MobileGate>
	);
}
