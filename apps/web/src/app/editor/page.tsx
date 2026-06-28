"use client";

import { useState, useEffect, useRef } from "react";
import { useWasm } from "@/hooks/use-wasm";
import { wasmBridge } from "@/core/wasm-bridge";
import { PromptMode } from "@/editor/PromptMode";
import { ExecutionContract } from "@/editor/ExecutionContract";
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
	Folder,
} from "lucide-react";
import { motion } from "framer-motion";

export default function EditorPage() {
	const { isReady, time, frame, projectData } = useWasm();
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const [isPromptModeOpen, setIsPromptModeOpen] = useState(false);
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

	// Setup initial timeline data
	useEffect(() => {
		if (isReady && time && (!projectData?.tracks || projectData.tracks.length === 0)) {
			// Add some mock tracks via the WASM engine
			time.addTrack("V1", "video");
			time.addTrack("A1", "audio");
			
			// Add mock clips
			time.addClip(0, "clip_1", "video", "A_Cam_001.mp4", 0, 300); // 10s
			time.addClip(0, "clip_2", "video", "B_Cam_002.mp4", 300, 450); // 15s
			
			time.addClip(1, "aud_1", "audio", "A_Cam_001.wav", 0, 300);
			time.addClip(1, "aud_2", "audio", "B_Cam_002.wav", 300, 450);
		}
	}, [isReady, projectData?.tracks?.length]);

	// Render frame to canvas
	useEffect(() => {
		if (isReady && canvasRef.current) {
			wasmBridge.renderToCanvas(canvasRef.current, frame).catch(err => {
				// Suppress render errors if WASM isn't fully ready
			});
		}
	}, [frame, isReady]);

	const [isMediaBinOpen, setIsMediaBinOpen] = useState(false);

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

	const handleClipDragEnd = (clip: any, info: any) => {
		// Calculate new start frame based on pixel movement
		// 10px = 30 frames
		const pixelDiff = info.offset.x;
		const frameDiff = Math.round((pixelDiff / 10) * 30);
		const newStart = Math.max(0, clip.start_frame + frameDiff);
		
		if (frameDiff !== 0) {
			time.trimClip(clip.id, newStart, clip.duration_frames);
		}
	};

	return (
		<div className="min-h-screen flex flex-col font-sans relative overflow-hidden bg-transparent">
			{/* Header */}
			<header className="px-6 py-4 glass-panel border-b-0 rounded-none border-b border-border flex items-center justify-between sticky top-0 z-50">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(0,212,223,0.3)]">
						<Video className="w-5 h-5 text-foreground" />
					</div>
					<span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
						Lazynext Editor
					</span>
				</div>
				<div className="flex items-center gap-4">
					<div className="text-xs text-foreground/40 mr-4">
						WASM Core:{" "}
						{isReady ? (
							<span className="text-green-400">Online</span>
						) : (
							<span className="text-yellow-400">Loading...</span>
						)}
					</div>
					<button className="btn-premium flex items-center gap-2 text-sm">
						<Settings className="w-4 h-4" /> Workspace Settings
					</button>
					<button
						className="btn-primary px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-black border-none"
						onClick={() => setIsPromptModeOpen(true)}
					>
						Enter Prompt Mode
					</button>
					<button className="btn-primary px-6 py-2">Export Project</button>
				</div>
			</header>

			{/* Main Workspace */}
			<main className="flex-1 flex gap-4 p-4 overflow-hidden h-[calc(100vh-73px)]">
				{/* Left Toolbar */}
				<aside className="w-16 glass-panel flex flex-col items-center py-6 gap-6 h-full shadow-2xl z-20">
					<button 
						className={`p-3 rounded-xl transition-all ${isMediaBinOpen ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-glass text-foreground/70 hover:text-cyan-400'}`}
						onClick={() => setIsMediaBinOpen(!isMediaBinOpen)}
					>
						<Folder className="w-6 h-6" />
					</button>
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

				{/* Collapsible Media Bin */}
				{isMediaBinOpen && (
					<aside className="w-64 glass-panel h-full shadow-2xl flex flex-col animate-in slide-in-from-left-8 z-10 p-4">
						<h2 className="font-display font-bold uppercase tracking-wider text-sm mb-4 text-foreground/80">Media Bin</h2>
						<div className="flex-1 overflow-y-auto space-y-2">
							{["A_Cam_001.mp4", "B_Cam_002.mp4", "Audio_Sync.wav", "Broll_01.mp4"].map((file, i) => (
								<div key={i} className="p-3 bg-background/40 rounded-lg flex items-center gap-3 cursor-grab hover:bg-background/60 transition-colors border border-border">
									<div className="w-8 h-8 rounded bg-cyan-900/50 flex items-center justify-center shrink-0">
										<Video className="w-4 h-4 text-cyan-400" />
									</div>
									<span className="text-xs truncate">{file}</span>
								</div>
							))}
						</div>
						<button className="btn-primary w-full mt-4 text-xs">Import Media</button>
					</aside>
				)}

				<div className="flex-1 flex flex-col gap-4 min-w-0">
					{/* Top Viewport */}
					<div className="flex-1 glass-panel relative overflow-hidden flex items-center justify-center bg-background/40 shadow-2xl group">
						<canvas
							ref={canvasRef}
							className="w-full h-full object-contain rounded-lg"
							width={1920}
							height={1080}
						/>

						{/* Floating Playback Controls */}
						<div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-panel px-6 py-3 rounded-full flex items-center gap-6 opacity-0 group-hover:opacity-100 transition-opacity">
							<button
								className="text-foreground/70 hover:text-foreground transition-colors"
								onClick={() => time?.setFrame(Math.max(0, frame - 30))}
							>
								<Rewind className="w-5 h-5 fill-current" />
							</button>
							<button
								onClick={togglePlayback}
								className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
							>
								{time?.isPlaying ? (
									<Pause className="w-5 h-5 fill-current" />
								) : (
									<Play className="w-5 h-5 fill-current ml-1" />
								)}
							</button>
							<button
								className="text-foreground/70 hover:text-foreground transition-colors"
								onClick={() => time?.setFrame(frame + 30)}
							>
								<FastForward className="w-5 h-5 fill-current" />
							</button>
						</div>
					</div>

					{/* Timeline */}
					<div className="h-64 glass-panel p-4 flex flex-col shadow-2xl overflow-hidden">
						<div className="flex items-center justify-between mb-4 px-2">
							<h3 className="font-display font-bold text-foreground/80 uppercase tracking-wider text-xs">
								{projectData?.name || "Sequence 01"}
							</h3>
							<div className="text-xs text-foreground/40 font-mono flex items-center gap-2">
								<div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
								Frame: {frame.toString().padStart(5, "0")}
							</div>
						</div>

						<div className="flex-1 relative bg-background/20 rounded-xl overflow-x-auto overflow-y-hidden border border-border p-2 space-y-2">
							{/* Playhead Indicator tied to frame */}
							<div
								className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
								style={{ left: `calc(40px + ${(frame / 30) * 10}px)` }}
							>
								<div className="w-3 h-3 bg-red-500 rounded-sm absolute -top-1 -translate-x-[5px]"></div>
							</div>

							{projectData?.tracks?.map((track: any) => (
								<div key={track.id} className="flex items-center gap-2 h-14 w-[150%] relative">
									<div className="w-8 flex items-center justify-center text-foreground/30 text-xs shrink-0">
										{track.name}
									</div>
									<div className="flex-1 h-full relative">
										{track.clips.map((clip: any) => (
											<motion.div
												key={clip.id}
												drag="x"
												dragMomentum={false}
												onDragEnd={(e, info) => handleClipDragEnd(clip, info)}
												className={`absolute h-full flex items-center px-2 text-xs overflow-hidden shadow-lg border rounded-md cursor-grab active:cursor-grabbing ${
													clip.is_disabled ? 'opacity-30 grayscale' : 'opacity-100'
												} ${
													track.track_type === "video" 
														? "bg-cyan-900/50 border-cyan-500/50 text-cyan-50" 
														: "bg-emerald-900/50 border-emerald-500/50 text-emerald-50"
												}`}
												style={{
													left: `${(clip.start_frame / 30) * 10}px`,
													width: `${(clip.duration_frames / 30) * 10}px`,
												}}
											>
												{track.track_type === "video" && (
													<div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover opacity-20 mix-blend-overlay pointer-events-none"></div>
												)}
												<span className="relative z-10 truncate">{clip.name}</span>
											</motion.div>
										))}
									</div>
								</div>
							))}
							
							{/* If no tracks exist, show empty state */}
							{(!projectData?.tracks || projectData.tracks.length === 0) && (
								<div className="w-full h-full flex flex-col items-center justify-center opacity-30">
									<Layers className="w-8 h-8 mb-2" />
									<span className="text-xs">No tracks in timeline</span>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Right Copilot Panel */}
				<aside className="w-96 glass-panel flex flex-col shadow-2xl relative overflow-hidden">
					<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
					<div className="p-5 border-b border-border flex items-center gap-3">
						<Bot className="w-6 h-6 text-cyan-400" />
						<h2 className="font-display font-bold text-lg">Chronos Copilot</h2>
					</div>

					<div className="flex-1 overflow-y-auto p-5 space-y-6">
						<ExecutionContract />
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

			{isPromptModeOpen && (
				<div className="fixed inset-0 z-[100]">
					<div className="absolute top-4 right-4 z-[101]">
						<button
							onClick={() => setIsPromptModeOpen(false)}
							className="bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600 transition-colors"
						>
							Close Prompt Mode
						</button>
					</div>
					<PromptMode />
				</div>
			)}
		</div>
	);
}
