"use client";

import { useState } from "react";
import { useWasm } from "@/hooks/use-wasm";
import {
	Send,
	Bot,
	User,
	Loader2,
	Video,
	Settings,
	Play,
	Pause,
	Rewind,
	FastForward,
	Scissors,
	Type,
	Layers,
} from "lucide-react";

export default function EditorPage() {
	const { isReady, time, frame } = useWasm();

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

	const handleSend = async () => {
		if (!prompt.trim()) return;

		const newChat = [...chat, { role: "user" as const, content: prompt }];
		setChat(newChat);
		setPrompt("");
		setIsProcessing(true);

		// Example of calling Rust WASM from UI!
		if (isReady && time) {
			time.insert_cut_from_script(0, 5000);
		}

		setTimeout(() => {
			setChat([
				...newChat,
				{
					role: "agent",
					content: `I've analyzed your intent. I trimmed the silences, color-graded the footage, and added a cinematic soundtrack. The timeline has been updated globally.`,
					videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
				},
			]);
			setIsProcessing(false);
		}, 2500);
	};

	const togglePlayback = () => {
		if (!isReady) return;
		if (time.isPlaying) {
			time.pause();
		} else {
			time.play();
		}
	};

	return (
		<div className="min-h-screen flex flex-col font-sans relative overflow-hidden bg-transparent">
			{/* Header */}
			<header className="px-6 py-4 glass-panel border-b-0 rounded-none border-b border-white/5 flex items-center justify-between sticky top-0 z-50">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(0,212,223,0.3)]">
						<Video className="w-5 h-5 text-white" />
					</div>
					<span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
						Lazynext Editor
					</span>
				</div>
				<div className="flex items-center gap-4">
					<div className="text-xs text-white/40 mr-4">
						WASM Core: {isReady ? <span className="text-green-400">Online</span> : <span className="text-yellow-400">Loading...</span>}
					</div>
					<button className="btn-premium flex items-center gap-2 text-sm">
						<Settings className="w-4 h-4" /> Workspace Settings
					</button>
					<button className="btn-primary px-6 py-2">Export Project</button>
				</div>
			</header>

			{/* Main Workspace */}
			<main className="flex-1 flex gap-4 p-4 overflow-hidden h-[calc(100vh-73px)]">
				{/* Left Toolbar */}
				<aside className="w-16 glass-panel flex flex-col items-center py-6 gap-6 h-full shadow-2xl">
					<button className="p-3 rounded-xl hover:bg-white/10 text-white/70 hover:text-cyan-400 transition-all">
						<Scissors className="w-6 h-6" />
					</button>
					<button className="p-3 rounded-xl hover:bg-white/10 text-white/70 hover:text-cyan-400 transition-all">
						<Type className="w-6 h-6" />
					</button>
					<button className="p-3 rounded-xl hover:bg-white/10 text-white/70 hover:text-cyan-400 transition-all">
						<Layers className="w-6 h-6" />
					</button>
				</aside>

				<div className="flex-1 flex flex-col gap-4 min-w-0">
					{/* Top Viewport */}
					<div className="flex-1 glass-panel relative overflow-hidden flex items-center justify-center bg-black/40 shadow-2xl group">
						{chat[chat.length - 1]?.videoUrl ? (
							<video
								controls
								src={chat[chat.length - 1].videoUrl}
								className="w-full h-full object-contain rounded-lg"
							/>
						) : (
							<div className="text-white/30 flex flex-col items-center gap-4">
								<Video className="w-16 h-16 opacity-50" />
								<p className="font-display font-medium text-lg tracking-wide">
									No Media Loaded
								</p>
							</div>
						)}

						{/* Floating Playback Controls */}
						<div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-panel px-6 py-3 rounded-full flex items-center gap-6 opacity-0 group-hover:opacity-100 transition-opacity">
							<button className="text-white/70 hover:text-white transition-colors" onClick={() => time?.setFrame(Math.max(0, frame - 30))}>
								<Rewind className="w-5 h-5 fill-current" />
							</button>
							<button onClick={togglePlayback} className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
								{time?.isPlaying ? (
									<Pause className="w-5 h-5 fill-current" />
								) : (
									<Play className="w-5 h-5 fill-current ml-1" />
								)}
							</button>
							<button className="text-white/70 hover:text-white transition-colors" onClick={() => time?.setFrame(frame + 30)}>
								<FastForward className="w-5 h-5 fill-current" />
							</button>
						</div>
					</div>

					{/* Timeline */}
					<div className="h-64 glass-panel p-4 flex flex-col shadow-2xl overflow-hidden">
						<div className="flex items-center justify-between mb-4 px-2">
							<h3 className="font-display font-bold text-white/80 uppercase tracking-wider text-xs">
								Sequence 01
							</h3>
							<div className="text-xs text-white/40 font-mono flex items-center gap-2">
								<div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
								Frame: {frame.toString().padStart(5, '0')} | 00:01:24:15
							</div>
						</div>

						<div className="flex-1 relative bg-black/20 rounded-xl overflow-x-auto overflow-y-hidden border border-white/5 p-2 space-y-2">
							{/* Playhead Indicator tied to frame */}
							<div 
								className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
								style={{ left: `calc(40px + ${(frame / 30) * 10}px)` }}
							>
								<div className="w-3 h-3 bg-red-500 rounded-sm absolute -top-1 -translate-x-[5px]"></div>
							</div>

							{/* Mock Timeline Tracks */}
							<div className="flex items-center gap-2 h-14 w-[150%]">
								<div className="w-8 flex items-center justify-center text-white/30 text-xs shrink-0">
									V1
								</div>
								<div className="timeline-clip flex-1 h-full px-4 flex items-center shadow-lg relative overflow-hidden group">
									<div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover opacity-20 mix-blend-overlay"></div>
									A_Cam_001.mp4
								</div>
								<div className="timeline-clip w-64 h-full px-4 flex items-center bg-purple-500/80 border-purple-400">
									B_Cam_002.mp4
								</div>
							</div>
							<div className="flex items-center gap-2 h-14 w-[150%]">
								<div className="w-8 flex items-center justify-center text-white/30 text-xs shrink-0">
									A1
								</div>
								<div className="timeline-clip flex-1 h-full px-4 flex items-center bg-emerald-500/80 border-emerald-400 text-black">
									A_Cam_001.wav
								</div>
								<div className="timeline-clip w-64 h-full px-4 flex items-center bg-emerald-500/80 border-emerald-400 text-black">
									B_Cam_002.wav
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Right Copilot Panel */}
				<aside className="w-96 glass-panel flex flex-col shadow-2xl relative overflow-hidden">
					<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
					<div className="p-5 border-b border-white/10 flex items-center gap-3">
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
									className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "agent" ? "bg-cyan-500/20" : "bg-white/10"}`}
								>
									{msg.role === "agent" ? (
										<Bot className="w-4 h-4 text-cyan-400" />
									) : (
										<User className="w-4 h-4 text-white/60" />
									)}
								</div>
								<div
									className={`text-sm leading-relaxed p-4 rounded-2xl ${msg.role === "user" ? "bg-white/10 text-white rounded-tr-none" : "bg-black/40 text-white/80 border border-white/5 rounded-tl-none shadow-inner"}`}
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
								<div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white/50 rounded-tl-none">
									Orchestrating timeline edits...
								</div>
							</div>
						)}
					</div>

					<div className="p-4 border-t border-white/10 bg-black/20">
						<div className="relative flex items-center">
							<input
								type="text"
								value={prompt}
								onChange={(e) => setPrompt(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleSend()}
								placeholder="Message Chronos..."
								className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-5 pr-12 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all backdrop-blur-md"
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
