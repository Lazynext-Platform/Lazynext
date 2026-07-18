/**
 * Integrations page — third-party services and API connections.
 *
 * @page /integrations
 */

"use client";

import { motion } from "framer-motion";
import { Film, MonitorPlay, Cloud, Link as LinkIcon, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";

/** React component rendering IntegrationsPage. */
export default function IntegrationsPage() {
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: { staggerChildren: 0.15 },
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, scale: 0.95, y: 20 },
		visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300 } },
	};

	const [integrations, setIntegrations] = useState([
		{ name: "YouTube", icon: <Film className="w-8 h-8 text-[#FF0000]" />, desc: "Directly publish rendered videos to your channel.", connected: true, loading: false },
		{ name: "TikTok", icon: <MonitorPlay className="w-8 h-8 text-[#00f2fe]" />, desc: "Sync vertical shorts seamlessly.", connected: false, loading: false },
		{ name: "Instagram", icon: <MonitorPlay className="w-8 h-8 text-[#E1306C]" />, desc: "Post directly to Instagram Reels.", connected: false, loading: false },
				{ name: "Facebook", icon: <MonitorPlay className="w-8 h-8 text-[#1877F2]" />, desc: "Publish to Facebook.", connected: false, loading: false },
		{ name: "LinkedIn", icon: <MonitorPlay className="w-8 h-8 text-[#0A66C2]" />, desc: "Publish to LinkedIn.", connected: false, loading: false },
		{ name: "Pinterest", icon: <MonitorPlay className="w-8 h-8 text-[#E60023]" />, desc: "Publish to Pinterest.", connected: false, loading: false },
		{ name: "Snapchat", icon: <MonitorPlay className="w-8 h-8 text-[#FFFC00]" />, desc: "Publish to Snapchat.", connected: false, loading: false },
		{ name: "Twitch", icon: <MonitorPlay className="w-8 h-8 text-[#9146FF]" />, desc: "Publish to Twitch.", connected: false, loading: false },
		{ name: "Vimeo", icon: <MonitorPlay className="w-8 h-8 text-[#1AB7EA]" />, desc: "Publish to Vimeo.", connected: false, loading: false },
		{ name: "Threads", icon: <MonitorPlay className="w-8 h-8 text-[#000000]" />, desc: "Publish to Threads.", connected: false, loading: false },
				{ name: "Reddit", icon: <MonitorPlay className="w-8 h-8 text-[#FF4500]" />, desc: "Publish to Reddit.", connected: false, loading: false },
		{ name: "Discord", icon: <MonitorPlay className="w-8 h-8 text-[#5865F2]" />, desc: "Publish to Discord.", connected: false, loading: false },
		{ name: "Bluesky", icon: <MonitorPlay className="w-8 h-8 text-[#0085FF]" />, desc: "Publish to Bluesky.", connected: false, loading: false },
		{ name: "Mastodon", icon: <MonitorPlay className="w-8 h-8 text-[#6364FF]" />, desc: "Publish to Mastodon.", connected: false, loading: false },
				{ name: "Dailymotion", icon: <MonitorPlay className="w-8 h-8 text-[#0064d2]" />, desc: "Publish to Dailymotion.", connected: false, loading: false },
		{ name: "Bilibili", icon: <MonitorPlay className="w-8 h-8 text-[#00a1d6]" />, desc: "Publish to Bilibili.", connected: false, loading: false },
		{ name: "Patreon", icon: <MonitorPlay className="w-8 h-8 text-[#FF424D]" />, desc: "Publish to Patreon.", connected: false, loading: false },
		{ name: "Medium", icon: <MonitorPlay className="w-8 h-8 text-[#000000]" />, desc: "Publish to Medium.", connected: false, loading: false },
		{ name: "WhatsApp", icon: <MonitorPlay className="w-8 h-8 text-[#25D366]" />, desc: "Publish to WhatsApp.", connected: false, loading: false },
		{ name: "WeChat", icon: <MonitorPlay className="w-8 h-8 text-[#07C160]" />, desc: "Publish to WeChat.", connected: false, loading: false },
		{ name: "Line", icon: <MonitorPlay className="w-8 h-8 text-[#00C300]" />, desc: "Publish to Line.", connected: false, loading: false },
		{ name: "Kwai", icon: <MonitorPlay className="w-8 h-8 text-[#FF7700]" />, desc: "Publish to Kwai.", connected: false, loading: false },
		{ name: "Tumblr", icon: <MonitorPlay className="w-8 h-8 text-[#36465D]" />, desc: "Publish to Tumblr.", connected: false, loading: false },
		{ name: "OnlyFans", icon: <MonitorPlay className="w-8 h-8 text-[#00AFF0]" />, desc: "Publish to OnlyFans.", connected: false, loading: false },
				{ name: "Kick", icon: <MonitorPlay className="w-8 h-8 text-[#53FC18]" />, desc: "Publish to Kick.", connected: false, loading: false },
		{ name: "Truth Social", icon: <MonitorPlay className="w-8 h-8 text-[#5A1B88]" />, desc: "Publish to Truth Social.", connected: false, loading: false },
		{ name: "VKontakte", icon: <MonitorPlay className="w-8 h-8 text-[#0077FF]" />, desc: "Publish to VKontakte.", connected: false, loading: false },
		{ name: "Weibo", icon: <MonitorPlay className="w-8 h-8 text-[#E6162D]" />, desc: "Publish to Weibo.", connected: false, loading: false },
		{ name: "KakaoTalk", icon: <MonitorPlay className="w-8 h-8 text-[#FEE500]" />, desc: "Publish to KakaoTalk.", connected: false, loading: false },
		{ name: "Viber", icon: <MonitorPlay className="w-8 h-8 text-[#7360F2]" />, desc: "Publish to Viber.", connected: false, loading: false },
		{ name: "Signal", icon: <MonitorPlay className="w-8 h-8 text-[#3A76F0]" />, desc: "Publish to Signal.", connected: false, loading: false },
		{ name: "Slack", icon: <MonitorPlay className="w-8 h-8 text-[#4A154B]" />, desc: "Publish to Slack.", connected: false, loading: false },
		{ name: "Substack", icon: <MonitorPlay className="w-8 h-8 text-[#FF6719]" />, desc: "Publish to Substack.", connected: false, loading: false },
		{ name: "Ghost", icon: <MonitorPlay className="w-8 h-8 text-[#15171A]" />, desc: "Publish to Ghost.", connected: false, loading: false },
		{ name: "Locals", icon: <MonitorPlay className="w-8 h-8 text-[#E32A26]" />, desc: "Publish to Locals.", connected: false, loading: false },
		{ name: "Odysee", icon: <MonitorPlay className="w-8 h-8 text-[#E21257]" />, desc: "Publish to Odysee.", connected: false, loading: false },
		{ name: "BitChute", icon: <MonitorPlay className="w-8 h-8 text-[#E33C2D]" />, desc: "Publish to BitChute.", connected: false, loading: false },
		{ name: "Flickr", icon: <MonitorPlay className="w-8 h-8 text-[#FF0084]" />, desc: "Publish to Flickr.", connected: false, loading: false },
		{ name: "Mixcloud", icon: <MonitorPlay className="w-8 h-8 text-[#5000ff]" />, desc: "Publish to Mixcloud.", connected: false, loading: false },
		{ name: "DTube", icon: <MonitorPlay className="w-8 h-8 text-[#FF0000]" />, desc: "Publish to DTube.", connected: false, loading: false },
		{ name: "Trovo", icon: <MonitorPlay className="w-8 h-8 text-[#10D164]" />, desc: "Publish to Trovo.", connected: false, loading: false },
		{ name: "Xigua", icon: <MonitorPlay className="w-8 h-8 text-[#FF3355]" />, desc: "Publish to Xigua.", connected: false, loading: false },
		{ name: "Telegram", icon: <MonitorPlay className="w-8 h-8 text-[#0088cc]" />, desc: "Publish to Telegram.", connected: false, loading: false },
		{ name: "Rumble", icon: <MonitorPlay className="w-8 h-8 text-[#85C742]" />, desc: "Publish to Rumble.", connected: false, loading: false },
		{ name: "X (Twitter)", icon: <MonitorPlay className="w-8 h-8 text-[#1DA1F2]" />, desc: "Share your video updates to X.", connected: false, loading: false },
		{ name: "Google Drive", icon: <Cloud className="w-8 h-8 text-[#00e5ff]" />, desc: "Import raw 4K footage straight into your timeline.", connected: false, loading: false },
		{ name: "Browser Extension", icon: <LinkIcon className="w-8 h-8 text-foreground" />, desc: "The Lazynext Chrome Extension.", connected: true, loading: false },
	]);

	const handleConnect = async (name: string) => {
		setIntegrations(prev => prev.map(app => app.name === name ? { ...app, loading: true } : app));
		
		try {
			const res = await fetch(`${process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://127.0.0.1:8005"}/api/v1/user/integrations/connect`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ platform: name })
			});
			const data = await res.json();
			if (data.success) {
				setIntegrations(prev => prev.map(app => app.name === name ? { ...app, connected: true, loading: false } : app));
			}
		} catch (e) {
			console.error("Failed to connect", e);
			setIntegrations(prev => prev.map(app => app.name === name ? { ...app, loading: false } : app));
		}
	};

	return (
		<div className="min-h-screen bg-background text-foreground font-sans p-8 md:p-24 selection:bg-[var(--accent-primary)]/30 selection:text-[var(--accent-primary)] relative overflow-hidden">
			<div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-[var(--accent-primary)]/5 rounded-full blur-[120px] pointer-events-none" />

			<motion.div
				variants={containerVariants}
				initial="hidden"
				animate="visible"
				className="max-w-6xl mx-auto relative z-10"
			>
				<motion.div variants={itemVariants} className="mb-16">
					<h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground tracking-tight">Integrations</h1>
					<p className="text-muted text-lg">Connect Lazynext with your favorite creator platforms for autonomous publishing.</p>
				</motion.div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
					{integrations.map((app) => (
						<motion.div 
							key={app.name} 
							variants={itemVariants}
							whileHover={{ y: -5 }}
							className="bg-panel backdrop-blur-xl border border-border rounded-3xl p-8 shadow-lg hover:border-[var(--accent-primary)]/30 transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
						>
							<div className="flex items-center gap-6">
								<div className="w-16 h-16 bg-hover border border-border rounded-2xl flex items-center justify-center">
									{app.icon}
								</div>
								<div>
									<h2 className="text-2xl font-bold text-foreground mb-1">{app.name}</h2>
									<p className="text-muted text-sm max-w-xs">{app.desc}</p>
								</div>
							</div>
							
							<div className="w-full sm:w-auto">
								{app.loading ? (
									<button disabled className="w-full sm:w-auto flex items-center justify-center gap-2 bg-hover text-foreground border border-border px-6 py-3 rounded-xl font-medium cursor-wait">
										<Loader2 className="w-5 h-5 animate-spin" /> Connecting...
									</button>
								) : app.connected ? (
									<button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 px-6 py-3 rounded-xl font-medium cursor-default">
										<CheckCircle2 className="w-5 h-5" /> Connected
									</button>
								) : (
									<button onClick={() => handleConnect(app.name)} className="w-full sm:w-auto bg-[var(--accent-primary)] text-[var(--bg-main)] px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-[var(--accent-glow)]">
										Connect
									</button>
								)}
							</div>
						</motion.div>
					))}
				</div>
			</motion.div>
		</div>
	);
}
