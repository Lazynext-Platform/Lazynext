"use client";

import React from "react";
import { useSession } from "@/auth/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

const QUICK_ACTIONS = [
	{ label: "New Project", href: "/projects?new=1", icon: "🎬", color: "bg-blue-600 hover:bg-blue-500" },
	{ label: "My Projects", href: "/projects", icon: "📁", color: "bg-blue-600 hover:bg-blue-500" },
	{ label: "AI Tools", href: "/editor/new", icon: "🤖", color: "bg-emerald-600 hover:bg-emerald-500" },
	{ label: "Billing", href: "/billing", icon: "💳", color: "bg-amber-600 hover:bg-amber-500" },
	{ label: "Settings", href: "/settings", icon: "⚙️", color: "bg-zinc-700 hover:bg-zinc-600" },
	{ label: "Documentation", href: "/docs", icon: "📖", color: "bg-rose-600 hover:bg-rose-500" },
];

const RECENT_STATS = [
	{ label: "Projects", value: "12", sub: "3 active" },
	{ label: "Exports", value: "47", sub: "this month" },
	{ label: "AI Generations", value: "128", sub: "this week" },
	{ label: "Storage", value: "2.1 GB", sub: "of 5 GB" },
];

export function DashboardClient() {
	const { data: session, isPending } = useSession();
	const router = useRouter();

	if (isPending) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="text-zinc-400">Loading...</div></div>;
	if (!session) { router.push("/sign-in"); return null; }

	return (
		<div className="min-h-screen bg-background text-foreground">
			<div className="mx-auto max-w-5xl px-4 py-12">
				<div className="mb-10">
					<h1 className="text-3xl font-bold text-white">Welcome back{session.user?.name ? `, ${session.user.name}` : ""}</h1>
					<p className="mt-2 text-zinc-400">Here&apos;s what&apos;s happening with your projects.</p>
				</div>

				{/* Stats */}
				<div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
					{RECENT_STATS.map((s) => (
						<div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
							<div className="text-2xl font-bold text-white">{s.value}</div>
							<div className="text-xs text-zinc-500">{s.label}</div>
							<div className="mt-1 text-xs text-zinc-600">{s.sub}</div>
						</div>
					))}
				</div>

				{/* Quick Actions */}
				<h2 className="mb-4 text-lg font-semibold text-white">Quick Actions</h2>
				<div className="grid grid-cols-2 gap-3 md:grid-cols-3">
					{QUICK_ACTIONS.map((a) => (
						<Link key={a.label} href={a.href}
							className={`flex items-center gap-3 rounded-xl px-4 py-4 text-sm font-medium text-white transition-colors ${a.color}`}>
							<span className="text-xl">{a.icon}</span> {a.label}
						</Link>
					))}
				</div>

				{/* Recent Projects */}
				<section className="mt-10">
					<h2 className="mb-4 text-lg font-semibold text-white">Recent Projects</h2>
					<div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
						<p className="text-sm text-zinc-500">No recent projects. Create your first one!</p>
						<Link href="/projects?new=1"
							className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
							Create Project
						</Link>
					</div>
				</section>
			</div>
		</div>
	);
}
