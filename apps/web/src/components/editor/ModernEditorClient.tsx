/**
 * Modern editor client — the primary NLE workspace with playback
 * viewer, chat interface, and agent controls.
 *
 * @module components/editor/ModernEditorClient
 */

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
	Upload,
	FileVideo,
	FileAudio,
	Image as ImageIcon,
} from "lucide-react";
import { storageService } from "@/services/storage/service";
import { useEditorState } from "./useEditorState";
import WasmPlayer from "./wasm-player";
import Timeline from "./timeline";
import { toast } from "sonner";

export default function ModernEditorClient({ project }: { project: any }) {
	const {
		projectData: ctxProject,
		setProjectData,
		isPlaying,
		setIsPlaying,
		assets,
		setAssets,
		currentTime,
		setCurrentTime,
	} = useEditorState();
	const [prompt, setPrompt] = useState("");
	const [chat, setChat] = useState<
		{ role: "user" | "agent"; content: string; videoUrl?: string }[]
	>([
		{
			role: "agent",
			content:
				"I am Lazynext AI Agent, your Autonomous Copilot. What are we building today?",
		},
	]);
	const [isProcessing, setIsProcessing] = useState(false);

	// Fallback to passed project if context not ready
	const activeProject = ctxProject || project;

	const handleSend = async () => {
		const trimmed = prompt.trim();
		if (!trimmed) return;
		if (trimmed.length > 50000) {
			toast.error("Prompt too long", {
				description: "Maximum prompt length is 50,000 characters",
			});
			return;
		}

		const newChat = [...chat, { role: "user" as const, content: trimmed }];
		setChat(newChat);
		setPrompt("");
		setIsProcessing(true);

		const updatedProject = { ...activeProject };

		try {
			const response = await fetch("/api/ai/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt: trimmed, type: "video" }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "AI generation failed");
			}

			const data = await response.json();
			const assetId = `ai-asset-${Date.now()}`;
			const duration_frames = 150; // default 5 seconds

			const newAsset = {
				id: assetId,
				type: data.type,
				name: data.name,
				url: data.url,
				duration_frames: duration_frames,
				color:
					data.type === "audio"
						? "bg-amber-600/80 border-amber-400"
						: "bg-indigo-600/80 border-indigo-400",
			};

			setAssets((prev: any[]) => [...prev, newAsset]);

			// Create a clip and place it on the timeline at current time
			const newClip = {
				id: `clip-${Date.now()}`,
				type: data.type,
				name: data.name,
				start_frame: currentTime,
				duration_frames: duration_frames,
				media_offset_frames: 0,
				transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
			};

			// Ensure tracks exist
			if (!updatedProject.tracks) updatedProject.tracks = [];

			// Find or create appropriate track
			let trackIdx = updatedProject.tracks.findIndex(
				(t: any) => t.type === data.type,
			);
			if (trackIdx === -1) {
				updatedProject.tracks.push({
					id: `track-${Date.now()}`,
					type: data.type,
					name: data.type === "video" ? "Video 1" : "Audio 1",
					clips: [],
					elements: [],
				});
				trackIdx = updatedProject.tracks.length - 1;
			}

			updatedProject.tracks[trackIdx].clips.push(newClip);

			setProjectData(updatedProject);

			// Save the project with the new AI clip to IndexedDB via storage service
			try {
				await storageService.saveProject(updatedProject);
			} catch (e) {
				console.error("Failed to save project state:", e);
			}

			setChat([
				...newChat,
				{
					role: "agent",
					content: `I generated a ${data.type} clip and automatically placed it on your timeline.`,
					videoUrl: data.url,
				},
			]);
			toast.success("AI Clip Added to Timeline!");
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

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const isAudio = file.type.startsWith("audio/");
		const isVideo = file.type.startsWith("video/");
		const isImage = file.type.startsWith("image/");

		if (!isAudio && !isVideo && !isImage) {
			toast.error("Unsupported file type");
			return;
		}

		toast.loading("Uploading media...");

		try {
			const objectUrl = URL.createObjectURL(file);
			const assetId = `asset-${Date.now()}`;

			const newAsset = {
				id: assetId,
				type: isAudio ? "audio" : isVideo ? "video" : "image",
				name: file.name,
				duration_frames: 300, // default 10 seconds, would parse duration in a real app
				color: isAudio
					? "bg-amber-600/80 border-amber-400 hover:bg-amber-500"
					: "bg-indigo-600/80 border-indigo-400 hover:bg-indigo-500",
				url: objectUrl,
				file: file,
			};

			// Save the actual File object into the OPFS via storageService
			await storageService.saveMediaAsset({
				projectId: activeProject.id,
				mediaAsset: newAsset as any,
			});

			setAssets((prev: any[]) => [...prev, newAsset]);
			toast.dismiss();
			toast.success("Media uploaded successfully!");
		} catch (error) {
			toast.dismiss();
			toast.error("Failed to save media asset");
			console.error(error);
		}
	};

	const handleDragStart = (e: React.DragEvent, asset: any) => {
		e.dataTransfer.setData(
			"application/json",
			JSON.stringify({
				type: "new_asset",
				id: asset.id,
				name: asset.name,
				assetType: asset.type,
				duration_frames: asset.duration_frames,
				color: asset.color,
			}),
		);
		e.dataTransfer.effectAllowed = "copy";
	};

	return (
		<div className="min-h-screen flex flex-col font-sans relative overflow-hidden bg-transparent w-full">
			{/* Main Workspace */}
			<main className="flex-1 flex gap-4 p-4 overflow-hidden h-[calc(100vh-73px)] w-full">
				{/* Left Toolbar */}
				<aside className="w-16 glass-panel flex flex-col items-center py-6 gap-6 h-full shadow-2xl shrink-0 border-r border-border/50">
					<label className="p-3 rounded-xl hover:bg-glass text-[var(--accent-primary)] cursor-pointer transition-all hover:scale-105 shadow-[var(--accent-glow)]">
						<Upload className="w-6 h-6" />
						<input
							type="file"
							className="hidden"
							onChange={handleFileUpload}
							accept="video/*,audio/*,image/*"
						/>
					</label>
					<div className="w-8 h-px bg-border/50 my-2"></div>
					<button className="p-3 rounded-xl hover:bg-glass text-foreground/70 hover:text-[var(--accent-primary)] transition-all">
						<Scissors className="w-6 h-6" />
					</button>
					<button className="p-3 rounded-xl hover:bg-glass text-foreground/70 hover:text-[var(--accent-primary)] transition-all">
						<Type className="w-6 h-6" />
					</button>
					<button className="p-3 rounded-xl hover:bg-glass text-foreground/70 hover:text-[var(--accent-primary)] transition-all">
						<Layers className="w-6 h-6" />
					</button>
				</aside>

				{/* Media Pool Panel */}
				<aside className="w-64 glass-panel flex flex-col shadow-2xl h-full shrink-0 border-r border-border/50">
					<div className="p-4 border-b border-border/50 flex items-center justify-between">
						<h3 className="font-display font-bold text-sm tracking-wide text-foreground/90 uppercase">
							Media Pool
						</h3>
						<span className="text-xs text-foreground/50 bg-background/50 px-2 py-0.5 rounded-full border border-border/50">
							{assets?.length || 0}
						</span>
					</div>
					<div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
						{!assets || assets.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-40 text-center text-foreground/40 border-2 border-dashed border-border/50 rounded-xl p-4">
								<ImageIcon className="w-8 h-8 mb-2 opacity-50" />
								<p className="text-xs">No media uploaded yet.</p>
								<p className="text-[10px] mt-1">Upload files to get started.</p>
							</div>
						) : (
							assets.map((asset: any) => (
								<div
									key={asset.id}
									draggable
									onDragStart={(e) => handleDragStart(e, asset)}
									className="group relative flex flex-col p-2 bg-background/50 rounded-lg border border-border/50 cursor-grab active:cursor-grabbing hover:border-[var(--accent-primary)]/50 hover:bg-background transition-all shadow-sm"
								>
									{asset.type === "video" || asset.type === "image" ? (
										<div className="w-full aspect-video bg-background rounded overflow-hidden mb-2 border border-border/50 relative">
											{asset.type === "image" ? (
												<img
													src={asset.url}
													alt={asset.name}
													className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
												/>
											) : (
												<video
													src={asset.url}
													className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
												/>
											)}
											<div className="absolute top-1 right-1 bg-background/80 p-1 rounded">
												{asset.type === "video" ? (
													<FileVideo className="w-3 h-3 text-[var(--accent-primary)]" />
												) : (
													<ImageIcon className="w-3 h-3 text-indigo-400" />
												)}
											</div>
										</div>
									) : (
										<div className="w-full h-12 bg-background rounded mb-2 border border-border/50 flex items-center justify-center relative">
											<FileAudio className="w-5 h-5 text-amber-500/50" />
										</div>
									)}
									<div className="flex items-center justify-between w-full px-1">
										<span
											className="truncate text-xs font-medium text-foreground group-hover:text-foreground transition-colors flex-1 pr-2"
											title={asset.name}
										>
											{asset.name}
										</span>
									</div>
								</div>
							))
						)}
					</div>
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
								className="w-10 h-10 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-accent)] flex items-center justify-center hover:scale-105 transition-transform shadow-[var(--accent-glow)]"
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
								frame={currentTime}
								onChangeFrame={(f) => setCurrentTime(f)}
								onProjectUpdate={(newProject) => {
									setProjectData(newProject);
								}}
								onCommitUpdate={async (newProject) => {
									setProjectData(newProject);
									try {
										await storageService.saveProject(newProject);
									} catch (e) {
										console.error("Failed to commit project update", e);
									}
								}}
								selectedClipId={null}
							/>
						</div>
					</div>
				</div>

				{/* Right Copilot Panel */}
				<aside className="w-96 glass-panel flex flex-col shadow-2xl relative overflow-hidden shrink-0">
					<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]"></div>
					<div className="p-5 border-b border-border flex items-center gap-3">
						<Bot className="w-6 h-6 text-[var(--accent-primary)]" />
						<h2 className="font-display font-bold text-lg">Lazynext AI Agent Copilot</h2>
					</div>

					<div className="flex-1 overflow-y-auto p-5 space-y-6">
						{chat.map((msg, idx) => (
							<div
								key={idx}
								className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
							>
								<div
									className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "agent" ? "bg-[var(--accent-primary)]/20" : "bg-glass"}`}
								>
									{msg.role === "agent" ? (
										<Bot className="w-4 h-4 text-[var(--accent-primary)]" />
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
								<div className="w-8 h-8 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center shrink-0">
									<Loader2 className="w-4 h-4 text-[var(--accent-primary)] animate-spin" />
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
								placeholder="Message Lazynext AI Agent..."
								className="w-full bg-hover border border-border rounded-full py-3 pl-5 pr-12 text-sm text-foreground focus:outline-none focus:border-[var(--accent-primary)]/50 focus:bg-glass transition-all backdrop-blur-md"
							/>
							<button
								onClick={handleSend}
								disabled={!prompt.trim() || isProcessing}
								className="absolute right-2 w-8 h-8 bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-[var(--accent-glow)]"
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
