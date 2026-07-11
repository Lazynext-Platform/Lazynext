/**
 * User profile page — displays user info, usage stats, and settings.
 *
 * @page /profile
 */

"use client";

import { motion } from "framer-motion";
import { User, Mail, Shield, HardDrive } from "lucide-react";
import { useState, useEffect } from "react";

export default function ProfilePage() {
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: { staggerChildren: 0.1 },
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300 } },
	};

	const [profile, setProfile] = useState<any>(null);

	useEffect(() => {
		fetch(`${process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://127.0.0.1:8005"}/api/v1/user/profile`)
			.then((res) => res.json())
			.then((data) => {
				if (data.success) setProfile(data.profile);
			})
			.catch((err) => console.error("Failed to load profile", err));
	}, []);

	if (!profile) return <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center text-[var(--accent-primary)]">Loading profile...</div>;

	return (
		<div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] font-sans p-8 md:p-24 selection:bg-[var(--accent-primary)]/30 selection:text-[var(--accent-primary)] relative overflow-hidden">
			{/* Ambient glows */}
			<div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[var(--accent-primary)]/5 rounded-full blur-[100px] pointer-events-none" />
			<div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[var(--accent-secondary)]/10 rounded-full blur-[120px] pointer-events-none" />

			<motion.div
				variants={containerVariants}
				initial="hidden"
				animate="visible"
				className="max-w-4xl mx-auto relative z-10"
			>
				<motion.div variants={itemVariants} className="mb-12">
					<h1 className="text-4xl md:text-5xl font-bold mb-4 text-[var(--text-primary)] tracking-tight">Your Profile</h1>
					<p className="text-[var(--text-muted)] text-lg">Manage your Lazynext creator identity and account security.</p>
				</motion.div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					<motion.div variants={itemVariants} className="bg-[var(--bg-panel)] backdrop-blur-xl border border-[var(--border-glass)] rounded-3xl p-8 shadow-lg hover:border-[var(--accent-primary)]/20 transition-all duration-300">
						<div className="flex items-center gap-4 mb-8">
							<div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full flex items-center justify-center text-[var(--text-on-accent)] text-2xl font-bold">
								{profile.initials}
							</div>
							<div>
								<h2 className="text-2xl font-semibold text-[var(--text-primary)]">{profile.name}</h2>
								<p className="text-[var(--accent-primary)]">{profile.tier}</p>
							</div>
						</div>

						<div className="space-y-6">
							<div>
								<label className="text-sm text-[var(--text-muted)] mb-2 flex items-center gap-2"><User className="w-4 h-4"/> Full Name</label>
								<input type="text" defaultValue={profile.name} className="w-full bg-[var(--bg-main)] border border-[var(--border-glass)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]/50 transition-colors" />
							</div>
							<div>
								<label className="text-sm text-[var(--text-muted)] mb-2 flex items-center gap-2"><Mail className="w-4 h-4"/> Email Address</label>
								<input type="email" defaultValue={profile.email} disabled className="w-full bg-[var(--bg-main)] border border-[var(--border-glass)] rounded-xl px-4 py-3 text-[var(--text-muted)] opacity-50 cursor-not-allowed" />
							</div>
						</div>
					</motion.div>

					<div className="space-y-8">
						<motion.div variants={itemVariants} className="bg-[var(--bg-panel)] backdrop-blur-xl border border-[var(--border-glass)] rounded-3xl p-8 shadow-lg hover:border-[var(--accent-primary)]/20 transition-all duration-300">
							<div className="flex items-center gap-3 mb-6">
								<Shield className="w-6 h-6 text-[var(--accent-primary)]" />
								<h2 className="text-xl font-semibold text-[var(--text-primary)]">Security</h2>
							</div>
							<p className="text-[var(--text-muted)] mb-6 text-sm">Protect your account with multifactor authentication.</p>
							<button className="w-full bg-[var(--bg-main)] hover:bg-[var(--bg-hover)] border border-[var(--border-glass)] text-[var(--text-primary)] rounded-xl px-4 py-3 transition-colors font-medium">
								Setup 2FA
							</button>
						</motion.div>

						<motion.div variants={itemVariants} className="bg-[var(--bg-panel)] backdrop-blur-xl border border-[var(--border-glass)] rounded-3xl p-8 shadow-lg hover:border-[var(--accent-primary)]/20 transition-all duration-300">
							<div className="flex items-center gap-3 mb-6">
								<HardDrive className="w-6 h-6 text-[var(--accent-primary)]" />
								<h2 className="text-xl font-semibold text-[var(--text-primary)]">Cloud Storage</h2>
							</div>
							<div className="w-full bg-[var(--bg-main)] rounded-full h-3 mb-2 overflow-hidden border border-[var(--border-glass)]">
								<div className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] h-full rounded-full" style={{ width: `${(profile.storage_used / profile.storage_total) * 100}%` }}></div>
							</div>
							<p className="text-[var(--text-muted)] text-sm flex justify-between">
								<span>{profile.storage_used} GB Used</span>
								<span>{profile.storage_total} GB Total</span>
							</p>
						</motion.div>
					</div>
				</div>
			</motion.div>
		</div>
	);
}
