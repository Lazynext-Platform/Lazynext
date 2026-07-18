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
