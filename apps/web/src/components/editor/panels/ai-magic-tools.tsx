/**
 * AI Magic Tools panel — one-click AI tools for voiceover, music
 * generation, smart silence removal, and object-aware editing.
 *
 * @module components/editor/panels/ai-magic-tools
 */

import React, { useState } from "react";
import { Sparkles, Wand2, Video, Mic, Music, RefreshCw } from "lucide-react";
import { useEditorState } from "../useEditorState";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function AIMagicTools() {
	const { setAssets } = useEditorState();
	const [activeTab, setActiveTab] = useState<"video" | "audio" | "music">("video");
	const [prompt, setPrompt] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);

	const handleGenerate = async () => {
		if (!prompt.trim()) return;

		setIsGenerating(true);
		try {
			const response = await fetch("/api/ai/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt, type: activeTab }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Generation failed");
			}

			const data = await response.json();

			const newAsset = {
				id: `asset-${Date.now()}`,
				name: data.name,
				type: data.type,
				url: data.url,
			};

			// Add to Media Pool
			setAssets((prev: any) => [...prev, newAsset]);
			toast.success(
				`${activeTab === "video" ? "Video" : activeTab === "audio" ? "Voiceover" : "Music"} generated and added to Media Pool!`,
			);
			setPrompt("");
		} catch (error: any) {
			toast.error(error.message || "Failed to generate media.");
			console.error(error);
		} finally {
			setIsGenerating(false);
		}
	};

	const tabOptions = [
		{ id: "video", icon: Video, label: "Text-to-Video" },
		{ id: "audio", icon: Mic, label: "Voice" },
		{ id: "music", icon: Music, label: "Music" },
	] as const;

	return (
		<div className="w-80 h-full bg-neutral-900/80 backdrop-blur-2xl border-l border-white/5 flex flex-col font-sans">
			<div className="p-4 border-b border-white/5 bg-neutral-950/40">
				<div className="flex items-center gap-2 mb-4">
					<Wand2 className="w-5 h-5 text-cyan-400" />
					<h2 className="font-semibold text-white/90 tracking-wide">Generative Studio</h2>
				</div>

				{/* Animated Tabs */}
				<div className="flex gap-1 p-1 bg-black/40 rounded-lg relative overflow-hidden">
					{tabOptions.map((tab) => {
						const isActive = activeTab === tab.id;
						const Icon = tab.icon;
						return (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id as any)}
								className={`relative z-10 flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
									isActive ? "text-white" : "text-white/50 hover:text-white/80"
								}`}
							>
								{isActive && (
									<motion.div
										layoutId="magic-tab-indicator"
										className="absolute inset-0 bg-white/10 rounded-md shadow-sm border border-white/10"
										initial={false}
										transition={{ type: "spring", stiffness: 400, damping: 30 }}
									/>
								)}
								<Icon className="w-3 h-3 relative z-10" />
								<span className="relative z-10">{tab.label}</span>
							</button>
						);
					})}
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-4 space-y-6">
				<AnimatePresence mode="wait">
					<motion.div
						key={activeTab}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
					>
						<label className="block text-xs font-medium text-white/60 mb-2">
							{activeTab === "video"
								? "Text-to-Video Prompt"
								: activeTab === "audio"
								? "Text-to-Speech Script"
								: "Text-to-Music Mood & Genre"}
						</label>
						<textarea
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							placeholder={
								activeTab === "video"
									? "A cinematic drone shot of a cyberpunk city..."
									: activeTab === "audio"
									? "Welcome to the future of editing..."
									: "Upbeat synthwave for a high-energy coding montage..."
							}
							className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 resize-none transition-all shadow-inner"
						/>
					</motion.div>
				</AnimatePresence>

				<button
					onClick={handleGenerate}
					disabled={isGenerating || !prompt.trim()}
					className="w-full relative group overflow-hidden bg-white/5 hover:bg-white/10 text-white/90 font-medium py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 flex items-center justify-center gap-2 shadow-lg hover:shadow-cyan-500/20"
				>
					{isGenerating ? (
						<>
							<RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
							<span>Generating...</span>
						</>
					) : (
						<>
							<Sparkles className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
							<span>Generate {activeTab === "video" ? "Video" : activeTab === "audio" ? "Audio" : "Track"}</span>
						</>
					)}

					{/* Premium Button Hover Glow */}
					<div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
				</button>

				<motion.div 
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.3 }}
					className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 mt-6 backdrop-blur-md"
				>
					<p className="text-xs text-cyan-400/90 leading-relaxed font-medium">
						<strong>Pro Tip:</strong> Generated assets are automatically added
						to your Media Pool. You can instantly drag them onto the timeline.
					</p>
				</motion.div>
			</div>
		</div>
	);
}
