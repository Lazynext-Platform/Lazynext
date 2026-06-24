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
		fetch("http://127.0.0.1:8005/api/v1/user/profile")
			.then((res) => res.json())
			.then((data) => {
				if (data.success) setProfile(data.profile);
			})
			.catch((err) => console.error("Failed to load profile", err));
	}, []);

	if (!profile) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-[#00e5ff]">Loading profile...</div>;

	return (
		<div className="min-h-screen bg-[#09090b] text-foreground font-sans p-8 md:p-24 selection:bg-[#00e5ff]/30 selection:text-[#00e5ff] relative overflow-hidden">
			{/* Ambient glows */}
			<div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00e5ff]/5 rounded-full blur-[100px] pointer-events-none" />
			<div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#0033ff]/10 rounded-full blur-[120px] pointer-events-none" />

			<motion.div
				variants={containerVariants}
				initial="hidden"
				animate="visible"
				className="max-w-4xl mx-auto relative z-10"
			>
				<motion.div variants={itemVariants} className="mb-12">
					<h1 className="text-4xl md:text-5xl font-bold mb-4 text-white tracking-tight">Your Profile</h1>
					<p className="text-neutral-400 text-lg">Manage your Lazynext creator identity and account security.</p>
				</motion.div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					<motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-lg hover:border-[#00e5ff]/20 transition-all duration-300">
						<div className="flex items-center gap-4 mb-8">
							<div className="w-16 h-16 bg-gradient-to-br from-[#00e5ff] to-[#0033ff] rounded-full flex items-center justify-center text-white text-2xl font-bold">
								{profile.initials}
							</div>
							<div>
								<h2 className="text-2xl font-semibold text-white">{profile.name}</h2>
								<p className="text-[#00e5ff]">{profile.tier}</p>
							</div>
						</div>

						<div className="space-y-6">
							<div>
								<label className="text-sm text-neutral-500 mb-2 flex items-center gap-2"><User className="w-4 h-4"/> Full Name</label>
								<input type="text" defaultValue={profile.name} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00e5ff]/50 transition-colors" />
							</div>
							<div>
								<label className="text-sm text-neutral-500 mb-2 flex items-center gap-2"><Mail className="w-4 h-4"/> Email Address</label>
								<input type="email" defaultValue={profile.email} disabled className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-neutral-400 opacity-50 cursor-not-allowed" />
							</div>
						</div>
					</motion.div>

					<div className="space-y-8">
						<motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-lg hover:border-[#00e5ff]/20 transition-all duration-300">
							<div className="flex items-center gap-3 mb-6">
								<Shield className="w-6 h-6 text-[#00e5ff]" />
								<h2 className="text-xl font-semibold text-white">Security</h2>
							</div>
							<p className="text-neutral-400 mb-6 text-sm">Protect your account with multifactor authentication.</p>
							<button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl px-4 py-3 transition-colors font-medium">
								Setup 2FA
							</button>
						</motion.div>

						<motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-lg hover:border-[#00e5ff]/20 transition-all duration-300">
							<div className="flex items-center gap-3 mb-6">
								<HardDrive className="w-6 h-6 text-[#00e5ff]" />
								<h2 className="text-xl font-semibold text-white">Cloud Storage</h2>
							</div>
							<div className="w-full bg-white/5 rounded-full h-3 mb-2 overflow-hidden border border-white/10">
								<div className="bg-gradient-to-r from-[#00e5ff] to-[#0033ff] h-full rounded-full" style={{ width: `${(profile.storage_used / profile.storage_total) * 100}%` }}></div>
							</div>
							<p className="text-neutral-400 text-sm flex justify-between">
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
