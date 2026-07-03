/**
 * Social Media Publishing panel — platform selector, video preview with
 * safe zones, auto-reframe, AI metadata generation, thumbnail A/B
 * testing, scheduled posting, and publish with progress.
 *
 * @module components/editor/panels/SocialPublish
 */

import React, { useState, useCallback } from "react";
import {
	Send,
	Image,
	Calendar,
	RefreshCw,
	Sparkles,
	Music,
	Video,
	Camera,
	MessageSquare,
	Timer,
	CheckCircle,
	Loader2,
	Film,
	Hash,
} from "lucide-react";
import { toast } from "sonner";

const SOCIAL_PUBLISH_URL = process.env.NEXT_PUBLIC_SOCIAL_PUBLISH_URL || "http://localhost:8007";

interface PlatformConfig {
	id: string;
	label: string;
	icon: React.ElementType;
	color: string;
	aspect: string;
	width: number;
	height: number;
	safeZone: { top: number; bottom: number; left: number; right: number };
}

const PLATFORMS: PlatformConfig[] = [
	{
		id: "tiktok",
		label: "TikTok",
		icon: Music,
		color: "#00f2ea",
		aspect: "9:16",
		width: 1080,
		height: 1920,
		safeZone: { top: 150, bottom: 150, left: 60, right: 60 },
	},
	{
		id: "youtube",
		label: "YouTube",
		icon: Video,
		color: "#ff0000",
		aspect: "16:9",
		width: 1920,
		height: 1080,
		safeZone: { top: 70, bottom: 70, left: 100, right: 100 },
	},
	{
		id: "instagram",
		label: "Instagram",
		icon: Camera,
		color: "#e1306c",
		aspect: "9:16",
		width: 1080,
		height: 1920,
		safeZone: { top: 120, bottom: 200, left: 40, right: 40 },
	},
	{
		id: "twitter",
		label: "Twitter / X",
		icon: MessageSquare,
		color: "#1d9bf0",
		aspect: "16:9",
		width: 1920,
		height: 1080,
		safeZone: { top: 50, bottom: 50, left: 80, right: 80 },
	},
];

interface ThumbnailCandidate {
	path: string;
	timestamp: number;
	score: number;
	appeal_score?: number;
	click_score?: number;
}

interface GeneratedMetadata {
	title: string;
	description: string;
	hashtags: string[];
	suggested_posting_time: string;
}

export function SocialPublish({
	projectData,
}: {
	projectData: any;
}) {
	const [selectedPlatform, setSelectedPlatform] = useState<PlatformConfig>(PLATFORMS[0]);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [hashtags, setHashtags] = useState<string[]>([]);
	const [hashtagInput, setHashtagInput] = useState("");
	const [thumbnails, setThumbnails] = useState<ThumbnailCandidate[]>([]);
	const [selectedThumbnail, setSelectedThumbnail] = useState<number | null>(null);
	const [scheduleDate, setScheduleDate] = useState("");
	const [scheduleTime, setScheduleTime] = useState("");
	const [isPublishing, setIsPublishing] = useState(false);
	const [isReframing, setIsReframing] = useState(false);
	const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
	const [publishProgress, setPublishProgress] = useState<number | null>(null);
	const [metadata, setMetadata] = useState<GeneratedMetadata | null>(null);

	// ── Platform Selector ──────────────────────────────────────────

	const handlePlatformSelect = useCallback((platform: PlatformConfig) => {
		setSelectedPlatform(platform);
		setMetadata(null);
	}, []);

	// ── Auto Reframe ───────────────────────────────────────────────

	const handleAutoReframe = useCallback(async () => {
		setIsReframing(true);
		try {
			const res = await fetch(`${SOCIAL_PUBLISH_URL}/auto-reframe`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					video_path: projectData?.exportPath || "/tmp/demo.mp4",
					target_platform: selectedPlatform.id,
				}),
			});
			const data = await res.json();
			if (data.success) {
				toast.success(`Reframed to ${selectedPlatform.aspect} (${data.resolution})`);
			} else {
				toast.error(data.error || "Reframe failed");
			}
		} catch {
			toast.error("Reframe service unavailable");
		} finally {
			setIsReframing(false);
		}
	}, [selectedPlatform, projectData]);

	// ── AI Metadata Generation ─────────────────────────────────────

	const handleGenerateMetadata = useCallback(async () => {
		setIsGeneratingMeta(true);
		try {
			const res = await fetch(`${SOCIAL_PUBLISH_URL}/generate-metadata`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					platform: selectedPlatform.id,
					title: title || undefined,
					description: description || undefined,
					tags: hashtags,
					video_topic: projectData?.name,
				}),
			});
			const data = await res.json();
			if (data.success) {
				setMetadata(data);
				setTitle(data.title);
				setDescription(data.description);
				setHashtags(data.hashtags);
				toast.success("Metadata generated!");
			} else {
				toast.error(data.error || "Metadata generation failed");
			}
		} catch {
			toast.error("Metadata service unavailable");
		} finally {
			setIsGeneratingMeta(false);
		}
	}, [selectedPlatform, title, description, hashtags, projectData]);

	// ── Thumbnail Generation ───────────────────────────────────────

	const handleGenerateThumbnails = useCallback(async () => {
		try {
			const res = await fetch(`${SOCIAL_PUBLISH_URL}/thumbnails/generate`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					video_path: projectData?.exportPath || "/tmp/demo.mp4",
					count: 5,
				}),
			});
			const data = await res.json();
			if (data.success) {
				setThumbnails(data.candidates);
				toast.success(`Generated ${data.candidates.length} thumbnails`);
			} else {
				toast.error(data.error || "Thumbnail generation failed");
			}
		} catch {
			toast.error("Thumbnail service unavailable");
		}
	}, [projectData]);

	const handleThumbnailTest = useCallback(async () => {
		if (thumbnails.length === 0) return;
		try {
			const res = await fetch(`${SOCIAL_PUBLISH_URL}/thumbnails/test`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ candidates: thumbnails }),
			});
			const data = await res.json();
			if (data.success) {
				setThumbnails(data.candidates);
				if (data.winner) {
					const winnerIdx = data.candidates.findIndex(
						(c: ThumbnailCandidate) => c.path === data.winner.path,
					);
					setSelectedThumbnail(winnerIdx >= 0 ? winnerIdx : 0);
				}
				toast.success("A/B test complete — winner selected!");
			}
		} catch {
			toast.error("A/B test service unavailable");
		}
	}, [thumbnails]);

	// ── Hashtag Input ──────────────────────────────────────────────

	const handleAddHashtag = useCallback(() => {
		const tag = hashtagInput.trim().replace(/^#/, "");
		if (tag && !hashtags.includes(tag)) {
			setHashtags((prev) => [...prev, tag]);
		}
		setHashtagInput("");
	}, [hashtagInput, hashtags]);

	const handleRemoveHashtag = useCallback((tag: string) => {
		setHashtags((prev) => prev.filter((t) => t !== tag));
	}, []);

	// ── Schedule ───────────────────────────────────────────────────

	const handleSchedulePost = useCallback(async () => {
		if (!scheduleDate || !scheduleTime) {
			toast.error("Please select a date and time");
			return;
		}
		const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
		try {
			const res = await fetch(`${SOCIAL_PUBLISH_URL}/schedule`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					video_path: projectData?.exportPath || "/tmp/demo.mp4",
					platform: selectedPlatform.id,
					title,
					description,
					tags: hashtags,
					hashtags,
					scheduled_at: scheduledAt,
				}),
			});
			const data = await res.json();
			if (data.success) {
				toast.success(`Scheduled for ${new Date(scheduledAt).toLocaleString()}`);
			} else {
				toast.error(data.error || "Scheduling failed");
			}
		} catch {
			toast.error("Schedule service unavailable");
		}
	}, [scheduleDate, scheduleTime, selectedPlatform, title, description, hashtags, projectData]);

	// ── Publish Now ────────────────────────────────────────────────

	const handlePublishNow = useCallback(async () => {
		setIsPublishing(true);
		setPublishProgress(0);
		try {
			const publishUrl = `${SOCIAL_PUBLISH_URL}/publish/${selectedPlatform.id}`;
			const res = await fetch(publishUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					video_path: projectData?.exportPath || "/tmp/demo.mp4",
					platform: selectedPlatform.id,
					title,
					description,
					tags: hashtags,
					hashtags,
				}),
			});

			setPublishProgress(80);
			const data = await res.json();

			if (data.success) {
				setPublishProgress(100);
				toast.success(`Published to ${selectedPlatform.label}! ${data.postUrl || ""}`);
			} else {
				toast.error(data.error || "Publish failed");
				setPublishProgress(null);
			}
		} catch {
			toast.error("Publish service unavailable");
			setPublishProgress(null);
		} finally {
			setIsPublishing(false);
		}
	}, [selectedPlatform, title, description, hashtags, projectData]);

	// ── Render ─────────────────────────────────────────────────────

	const PlatformIcon = selectedPlatform.icon;

	return (
		<div className="absolute inset-0 bg-background flex p-4 gap-4 z-40 overflow-hidden">
			{/* Left Sidebar: Settings */}
			<div className="w-[400px] flex flex-col bg-background border border-border rounded-xl overflow-hidden h-full shadow-2xl">
				<div className="flex items-center px-4 h-14 border-b border-border bg-background/80">
					<Send className="w-5 h-5 text-pink-400 mr-2" />
					<span className="text-sm font-bold text-foreground tracking-wider">
						SOCIAL PUBLISH
					</span>
				</div>

				<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 custom-scrollbar">
					{/* ── Platform Selector ── */}
					<div>
						<h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">
							Platform
						</h3>
						<div className="grid grid-cols-4 gap-2">
							{PLATFORMS.map((p) => (
								<button
									key={p.id}
									onClick={() => handlePlatformSelect(p)}
									className={`flex flex-col items-center justify-center py-3 rounded-lg border transition-colors ${
										selectedPlatform.id === p.id
											? "border-pink-500 bg-pink-600/10 text-foreground"
											: "border-border text-muted hover:border-zinc-600 hover:text-foreground"
									}`}
								>
									<p.icon className="w-5 h-5 mb-1" style={{ color: p.color }} />
									<span className="text-[10px] font-bold">{p.label}</span>
									<span className="text-[9px] text-muted">{p.aspect}</span>
								</button>
							))}
						</div>
					</div>

					{/* ── Auto Reframe ── */}
					<div className="bg-panel rounded-lg p-3">
						<div className="flex items-center gap-2 mb-2">
							<Film className="w-4 h-4 text-pink-400" />
							<span className="text-xs font-semibold text-foreground">
								Auto Reframe
							</span>
						</div>
						<p className="text-[10px] text-muted mb-3">
							Smart reframe to {selectedPlatform.aspect} ({selectedPlatform.width}x{selectedPlatform.height}) with content-aware framing
						</p>
						<button
							onClick={handleAutoReframe}
							disabled={isReframing}
							className="w-full py-2 bg-pink-600/20 border border-pink-500/40 text-pink-300 text-xs font-bold rounded-lg hover:bg-pink-600/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
						>
							{isReframing ? (
								<Loader2 className="w-3.5 h-3.5 animate-spin" />
							) : (
								<RefreshCw className="w-3.5 h-3.5" />
							)}
							{isReframing ? "Reframing..." : `Reframe to ${selectedPlatform.aspect}`}
						</button>
					</div>

					{/* ── Title & Description ── */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<h3 className="text-xs font-bold text-muted uppercase tracking-widest">
								Title & Description
							</h3>
							<button
								onClick={handleGenerateMetadata}
								disabled={isGeneratingMeta}
								className="flex items-center gap-1 px-2 py-1 bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold rounded hover:bg-indigo-600/30 transition-colors disabled:opacity-50"
							>
								{isGeneratingMeta ? (
									<Loader2 className="w-3 h-3 animate-spin" />
								) : (
									<Sparkles className="w-3 h-3" />
								)}
								AI Generate
							</button>
						</div>
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Video title..."
							className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-pink-500"
						/>
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder={`Write a ${selectedPlatform.label}-optimized description...`}
							rows={3}
							className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-pink-500 resize-none"
						/>

						{/* ── Hashtags ── */}
						<div>
							<div className="flex items-center gap-2 mb-2">
								<Hash className="w-3.5 h-3.5 text-muted" />
								<span className="text-[10px] font-medium text-muted">Hashtags</span>
							</div>
							<div className="flex gap-1 mb-2">
								<input
									type="text"
									value={hashtagInput}
									onChange={(e) => setHashtagInput(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleAddHashtag()}
									placeholder="Add hashtag..."
									className="flex-1 bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-pink-500"
								/>
								<button
									onClick={handleAddHashtag}
									className="px-2 py-1.5 bg-panel border border-border rounded text-[10px] font-bold text-muted hover:text-foreground transition-colors"
								>
									Add
								</button>
							</div>
							{hashtags.length > 0 && (
								<div className="flex flex-wrap gap-1">
									{hashtags.map((tag) => (
										<span
											key={tag}
											className="flex items-center gap-1 px-2 py-0.5 bg-indigo-600/10 border border-indigo-500/30 rounded text-[10px] text-indigo-300"
										>
											#{tag}
											<button
												onClick={() => handleRemoveHashtag(tag)}
												className="text-indigo-400 hover:text-red-400 ml-0.5"
											>
												x
											</button>
										</span>
									))}
								</div>
							)}
						</div>
					</div>

					{/* ── Thumbnails ── */}
					<div>
						<div className="flex items-center justify-between mb-2">
							<div className="flex items-center gap-2">
								<Image className="w-4 h-4 text-muted" />
								<span className="text-xs font-semibold text-muted">Thumbnail</span>
							</div>
							<div className="flex gap-1">
								<button
									onClick={handleGenerateThumbnails}
									className="px-2 py-1 bg-panel border border-border rounded text-[10px] font-bold text-muted hover:text-foreground transition-colors"
								>
									Extract
								</button>
								{thumbnails.length > 0 && (
									<button
										onClick={handleThumbnailTest}
										className="px-2 py-1 bg-emerald-600/20 border border-emerald-500/40 rounded text-[10px] font-bold text-emerald-300 hover:bg-emerald-600/30 transition-colors"
									>
										A/B Test
									</button>
								)}
							</div>
						</div>
						{thumbnails.length > 0 ? (
							<div className="grid grid-cols-5 gap-1">
								{thumbnails.map((thumb, idx) => (
									<button
										key={thumb.path}
										onClick={() => setSelectedThumbnail(idx)}
										className={`relative aspect-video rounded border overflow-hidden ${
											selectedThumbnail === idx
												? "border-pink-500 ring-1 ring-pink-500/50"
												: "border-border hover:border-zinc-500"
										}`}
									>
										<div className="w-full h-full bg-panel flex items-center justify-center text-[8px] text-muted">
											{thumb.timestamp.toFixed(1)}s
										</div>
										{thumb.appeal_score !== undefined && (
											<div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[8px] text-emerald-400 text-center py-0.5">
												{thumb.appeal_score}%
											</div>
										)}
										{selectedThumbnail === idx && (
											<div className="absolute top-0.5 right-0.5">
												<CheckCircle className="w-3 h-3 text-pink-400" />
											</div>
										)}
									</button>
								))}
							</div>
						) : (
							<div className="w-full h-16 bg-panel rounded border border-dashed border-border flex items-center justify-center">
								<span className="text-[10px] text-muted">
									Extract thumbnails to preview
								</span>
							</div>
						)}
					</div>

					{/* ── Schedule ── */}
					<div>
						<div className="flex items-center gap-2 mb-2">
							<Calendar className="w-4 h-4 text-muted" />
							<span className="text-xs font-semibold text-muted">Schedule</span>
						</div>
						<div className="flex gap-2 mb-2">
							<input
								type="date"
								value={scheduleDate}
								onChange={(e) => setScheduleDate(e.target.value)}
								className="flex-1 bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-pink-500"
							/>
							<input
								type="time"
								value={scheduleTime}
								onChange={(e) => setScheduleTime(e.target.value)}
								className="flex-1 bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-pink-500"
							/>
						</div>
						<button
							onClick={handleSchedulePost}
							className="w-full py-2 bg-panel border border-border rounded-lg text-xs font-bold text-muted hover:border-zinc-500 hover:text-foreground transition-colors flex items-center justify-center gap-2"
						>
							<Timer className="w-3.5 h-3.5" />
							Schedule Post
						</button>
					</div>

					{/* ── Best Posting Time (if metadata generated) ── */}
					{metadata?.suggested_posting_time && (
						<div className="bg-indigo-600/5 border border-indigo-500/20 rounded-lg p-3">
							<div className="flex items-center gap-2 mb-1">
								<Sparkles className="w-3.5 h-3.5 text-indigo-400" />
								<span className="text-[10px] font-bold text-indigo-300">
									Best Posting Time
								</span>
							</div>
							<p className="text-[10px] text-muted">
								{metadata.suggested_posting_time}
							</p>
						</div>
					)}
				</div>

				{/* ── Publish Button ── */}
				<div className="p-4 border-t border-border bg-background">
					{publishProgress !== null && (
						<div className="mb-3">
							<div className="flex justify-between items-center mb-1">
								<span className="text-[10px] font-bold text-muted uppercase tracking-wider">
									{publishProgress === 100 ? "Published!" : "Publishing..."}
								</span>
								<span className="text-[10px] font-mono text-foreground">
									{Math.round(publishProgress)}%
								</span>
							</div>
							<div className="w-full bg-panel rounded-full h-1.5 overflow-hidden">
								<div
									className={`h-full transition-all duration-500 rounded-full ${
										publishProgress === 100 ? "bg-emerald-500" : "bg-pink-500"
									}`}
									style={{ width: `${publishProgress}%` }}
								/>
							</div>
						</div>
					)}
					<button
						onClick={handlePublishNow}
						disabled={isPublishing}
						className="w-full py-3 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-foreground font-bold tracking-wider rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2"
					>
						{isPublishing ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Send className="w-4 h-4" />
						)}
						{isPublishing
							? "PUBLISHING..."
							: publishProgress === 100
								? "PUBLISH AGAIN"
								: `PUBLISH TO ${selectedPlatform.label.toUpperCase()}`}
					</button>
				</div>
			</div>

			{/* Right Area: Video Preview with Safe Zones */}
			<div className="flex-1 bg-background border border-border rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
				<div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-pink-500 via-zinc-900 to-zinc-950" />

				{/* Platform safe zone overlay */}
				<div className="absolute inset-0 flex items-center justify-center z-10">
					<div
						className="relative border border-pink-500/30 bg-black/40 rounded-lg overflow-hidden"
						style={{
							aspectRatio: selectedPlatform.aspect.replace(":", "/"),
							maxWidth: "90%",
							maxHeight: "80%",
						}}
					>
						{/* Video placeholder */}
						<div className="w-full h-full bg-panel flex items-end justify-center relative">
							<div className="absolute inset-0 flex items-center justify-center">
								<PlatformIcon
									className="w-20 h-20 opacity-20"
									style={{ color: selectedPlatform.color }}
								/>
							</div>

							{/* Safe zone overlay */}
							<div
								className="absolute border border-dashed border-pink-500/50"
								style={{
									top: `${(selectedPlatform.safeZone.top / selectedPlatform.height) * 100}%`,
									bottom: `${(selectedPlatform.safeZone.bottom / selectedPlatform.height) * 100}%`,
									left: `${(selectedPlatform.safeZone.left / selectedPlatform.width) * 100}%`,
									right: `${(selectedPlatform.safeZone.right / selectedPlatform.width) * 100}%`,
								}}
							>
								<span className="absolute top-1 left-1 text-[8px] text-pink-400/60">
									safe zone
								</span>
							</div>

							{/* Dimensions label */}
							<div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 rounded text-[9px] text-muted">
								{selectedPlatform.width}x{selectedPlatform.height} ({selectedPlatform.aspect})
							</div>

							{/* Platform label */}
							<div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold text-foreground" style={{ backgroundColor: `${selectedPlatform.color}33` }}>
								<PlatformIcon className="w-3.5 h-3.5 inline mr-1" style={{ color: selectedPlatform.color }} />
								{selectedPlatform.label}
							</div>
						</div>
					</div>
				</div>

				{/* Info text */}
				<div className="relative z-10 text-center mt-4">
					<p className="text-xs text-zinc-600">
						{projectData?.tracks?.reduce((acc: number, t: any) => acc + (t.clips?.length || 0), 0) || 0} clips
						{" "}across {projectData?.tracks?.length || 0} tracks
					</p>
					<p className="text-[10px] text-zinc-700 mt-1">
						Duration: {projectData?.duration ? `${projectData.duration}s` : "N/A"}
					</p>
				</div>
			</div>
		</div>
	);
}

export default SocialPublish;
