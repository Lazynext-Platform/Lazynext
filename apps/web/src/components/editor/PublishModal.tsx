"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

interface PublishModalProps {
	isOpen: boolean;
	onClose: () => void;
	projectId: string;
	renderJobId?: string | null;
}

export function PublishModal({ isOpen, onClose, projectId, renderJobId }: PublishModalProps) {
	const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [publishing, setPublishing] = useState(false);

	if (!isOpen) return null;

	const togglePlatform = (platform: string) => {
		setSelectedPlatforms((prev) =>
			prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
		);
	};

	const handlePublish = async () => {
		if (selectedPlatforms.length === 0) {
			toast.error("Please select at least one platform");
			return;
		}

		if (!renderJobId) {
			toast.error("No active render job found. Export the video via Render Farm first.");
			return;
		}

		setPublishing(true);

		try {
			// Get token for API Gateway
			const sessionRes = await fetch("/api/auth/session");
			const session = await sessionRes.json();
			const token = session?.session?.token;

			for (const platform of selectedPlatforms) {
				const RUST_API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://127.0.0.1:8005";
				const res = await fetch(`${RUST_API_GATEWAY_URL}/api/v1/social/publish`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(token && { Authorization: `Bearer ${token}` }),
					},
					body: JSON.stringify({
						platform,
						render_job_id: renderJobId,
						metadata: {
							title,
							description,
							tags: ["lazynext", "video"],
						},
					}),
				});

				if (!res.ok) {
					const errorText = await res.text();
					throw new Error(`Failed to publish to ${platform}: ${errorText}`);
				}
			}

			toast.success("Successfully queued for publishing!");
			onClose();
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			setPublishing(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm">
			<div className="w-[500px] rounded-xl border border-border bg-panel p-6 shadow-2xl relative">
				<button
					onClick={onClose}
					className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"
				>
					<X className="h-5 w-5" />
				</button>
				<h2 className="text-xl font-bold text-foreground">Publish to Socials</h2>
				<p className="mt-1 text-sm text-muted">
					Push your exported video directly to connected social accounts.
				</p>

				<div className="mt-6 space-y-4">
					<div>
						<label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">
							Platforms
						</label>
						<div className="flex gap-3">
							<button
								onClick={() => togglePlatform("tiktok")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("tiktok")
										? "border-black bg-black text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 15.68l.01.2a6.33 6.33 0 009.68 4.09 6.47 6.47 0 003.07-5.52V8.9a8.36 8.36 0 004.83 1.54V7.05a5.38 5.38 0 01-3-1l.01.64z"/></svg>
								TikTok
							</button>
							<button
								onClick={() => togglePlatform("youtube")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("youtube")
										? "border-red-600 bg-red-600 text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
								YouTube
							</button>
							<button
								onClick={() => togglePlatform("instagram")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("instagram")
										? "border-fuchsia-600 bg-gradient-to-tr from-yellow-400 to-fuchsia-600 text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
								Instagram
							</button>
							<button
								onClick={() => togglePlatform("twitter")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("twitter")
										? "border-blue-500 bg-blue-500 text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.054 10.054 0 01-3.127 1.184 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
								X (Twitter)
							</button>
							<button
								onClick={() => togglePlatform("facebook")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("facebook")
										? "border-[#1877F2] bg-[#1877F2] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Facebook
							</button>
							<button
								onClick={() => togglePlatform("linkedin")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("linkedin")
										? "border-[#0A66C2] bg-[#0A66C2] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								LinkedIn
							</button>
							<button
								onClick={() => togglePlatform("pinterest")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("pinterest")
										? "border-[#E60023] bg-[#E60023] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Pinterest
							</button>
							<button
								onClick={() => togglePlatform("snapchat")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("snapchat")
										? "border-[#FFFC00] bg-[#FFFC00] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Snapchat
							</button>
							<button
								onClick={() => togglePlatform("twitch")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("twitch")
										? "border-[#9146FF] bg-[#9146FF] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Twitch
							</button>
							<button
								onClick={() => togglePlatform("vimeo")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("vimeo")
										? "border-[#1AB7EA] bg-[#1AB7EA] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Vimeo
							</button>
							<button
								onClick={() => togglePlatform("threads")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("threads")
										? "border-[#000000] bg-[#000000] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Threads
							</button>
							<button
								onClick={() => togglePlatform("rumble")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("rumble")
										? "border-[#85C742] bg-[#85C742] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Rumble
							</button>
							<button
								onClick={() => togglePlatform("reddit")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("reddit")
										? "border-[#FF4500] bg-[#FF4500] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Reddit
							</button>
							<button
								onClick={() => togglePlatform("discord")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("discord")
										? "border-[#5865F2] bg-[#5865F2] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Discord
							</button>
							<button
								onClick={() => togglePlatform("bluesky")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("bluesky")
										? "border-[#0085FF] bg-[#0085FF] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Bluesky
							</button>
							<button
								onClick={() => togglePlatform("mastodon")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("mastodon")
										? "border-[#6364FF] bg-[#6364FF] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Mastodon
							</button>
							<button
								onClick={() => togglePlatform("telegram")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("telegram")
										? "border-[#0088cc] bg-[#0088cc] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Telegram
							</button>
							<button
								onClick={() => togglePlatform("dailymotion")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("dailymotion")
										? "border-[#0064d2] bg-[#0064d2] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Dailymotion
							</button>
							<button
								onClick={() => togglePlatform("bilibili")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("bilibili")
										? "border-[#00a1d6] bg-[#00a1d6] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Bilibili
							</button>
							<button
								onClick={() => togglePlatform("patreon")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("patreon")
										? "border-[#FF424D] bg-[#FF424D] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Patreon
							</button>
							<button
								onClick={() => togglePlatform("medium")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("medium")
										? "border-[#000000] bg-[#000000] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Medium
							</button>
							<button
								onClick={() => togglePlatform("whatsapp")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("whatsapp")
										? "border-[#25D366] bg-[#25D366] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								WhatsApp
							</button>
							<button
								onClick={() => togglePlatform("wechat")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("wechat")
										? "border-[#07C160] bg-[#07C160] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								WeChat
							</button>
							<button
								onClick={() => togglePlatform("line")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("line")
										? "border-[#00C300] bg-[#00C300] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Line
							</button>
							<button
								onClick={() => togglePlatform("kwai")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("kwai")
										? "border-[#FF7700] bg-[#FF7700] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Kwai
							</button>
							<button
								onClick={() => togglePlatform("tumblr")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("tumblr")
										? "border-[#36465D] bg-[#36465D] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Tumblr
							</button>
							<button
								onClick={() => togglePlatform("onlyfans")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("onlyfans")
										? "border-[#00AFF0] bg-[#00AFF0] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								OnlyFans
							</button>
							<button
								onClick={() => togglePlatform("xigua")}
								className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
									selectedPlatforms.includes("xigua")
										? "border-[#FF3355] bg-[#FF3355] text-white"
										: "border-border bg-background text-muted hover:text-foreground"
								}`}
							>
								Xigua
							</button>
						</div>
					</div>

					<div>
						<label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">
							Post Title
						</label>
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
							placeholder="My Awesome Edit"
						/>
					</div>

					<div>
						<label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">
							Description & Tags
						</label>
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							className="w-full h-24 rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-indigo-500 focus:outline-none resize-none"
							placeholder="Check out this edit! #lazynext"
						/>
					</div>

					<button
						onClick={handlePublish}
						disabled={publishing || selectedPlatforms.length === 0}
						className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors mt-4"
					>
						{publishing ? "Publishing..." : `Publish to ${selectedPlatforms.length} platform(s)`}
					</button>
				</div>
			</div>
		</div>
	);
}
