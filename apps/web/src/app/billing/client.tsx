"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "@/auth/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Header } from "@/components/header";
import { Check, Zap, Server } from "lucide-react";

// Mock Data Type
import type { Organization } from "@/lib/mock-db";

const PLANS = [
	{
		name: "Hobby",
		price: "$0",
		period: "forever",
		features: ["1 project", "720p export", "Basic AI tools (Local Models)"],
		cta: "Current Plan",
		current: true,
	},
	{
		name: "Pro",
		price: "$19",
		period: "per month",
		features: [
			"Unlimited projects",
			"4K export",
			"Cloud AI (GPT-4o, Claude)",
			"Priority support",
			"50GB Cloud storage",
		],
		cta: "Upgrade to Pro",
		highlight: false,
	},
	{
		name: "Studio",
		price: "$99",
		period: "per month",
		features: [
			"Everything in Pro",
			"8K Lossless export",
			"Team collaboration",
			"18 API access",
			"Dedicated Render Node",
		],
		cta: "Upgrade to Studio",
		highlight: true,
	},
];

export function BillingPageClient() {
	const { data: session, isPending } = useSession();
	const router = useRouter();

	const [org, setOrg] = useState<Organization | null>(null);

	useEffect(() => {
		// Simulate fetching from mock DB
		fetch("/api/mock-db?org=org_acme_123")
			.then((res) => res.json())
			.then((data) => setOrg(data.org))
			.catch(() => {
				// Fallback if API route doesn't exist
				setOrg({
					id: "org_acme_123",
					name: "Acme Video Corp",
					memberCount: 12,
					maxMembers: 15,
					renderHoursUsed: 142,
					aiCreditsUsed: 45200,
					members: [],
				});
			});
	}, []);

	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)]">
				<div className="text-[var(--text-muted)] animate-pulse">
					Loading SaaS Portal...
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)]">
			<Header />
			<div className="mx-auto max-w-6xl px-4 py-16">
				<div className="mb-12 text-center">
					<h1 className="text-4xl md:text-5xl font-black tracking-tight">
						Simple pricing for{" "}
						<span className="text-[var(--accent-primary)]">heavy renders</span>.
					</h1>
					<p className="mt-4 text-[var(--text-muted)] text-lg max-w-2xl mx-auto">
						Unlock the power of 18 integrated AI models and dedicated Rust
						headless compositors.
					</p>
				</div>

				{/* Current Usage Banner */}
				{org && (
					<div className="mb-12 bg-[var(--bg-panel)] border border-[var(--border-glass)] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
						<div>
							<h2 className="font-bold text-xl">Current Billing Cycle</h2>
							<p className="text-[var(--text-muted)] text-sm mt-1">
								Your usage resets in 14 days.
							</p>
						</div>
						<div className="flex gap-8">
							<div className="flex items-center gap-3">
								<div className="p-3 bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)] rounded-lg">
									<Zap className="w-6 h-6" />
								</div>
								<div>
									<p className="text-[var(--text-muted)] text-xs font-semibold uppercase">
										AI Credits
									</p>
									<p className="font-bold text-xl text-[var(--text-primary)]">
										{org.aiCreditsUsed.toLocaleString()} / 50K
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<div className="p-3 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-lg">
									<Server className="w-6 h-6" />
								</div>
								<div>
									<p className="text-[var(--text-muted)] text-xs font-semibold uppercase">
										Render Hours
									</p>
									<p className="font-bold text-xl text-[var(--text-primary)]">
										{org.renderHoursUsed}h / 200h
									</p>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Plans Grid */}
				<div className="grid gap-6 md:grid-cols-3 items-stretch">
					{PLANS.map((plan) => (
						<div
							key={plan.name}
							className={`relative rounded-3xl p-8 flex flex-col transition-all duration-300 ${
								plan.highlight
									? "border border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 shadow-[0_0_40px_rgba(1,243,254,0.15)] scale-105 z-10"
									: "border border-[var(--border-glass)] bg-[var(--bg-panel)]"
							}`}
						>
							{plan.highlight && (
								<div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent-primary)] text-[#050505] px-4 py-1 text-xs font-bold uppercase tracking-wider shadow-lg">
									Most Popular
								</div>
							)}

							<h3
								className={`text-2xl font-bold ${plan.highlight ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"}`}
							>
								{plan.name}
							</h3>

							<div className="mt-4 pb-6 border-b border-[var(--border-glass)]">
								<span className="text-5xl font-black">{plan.price}</span>
								<span className="ml-2 text-sm text-[var(--text-muted)]">
									{plan.period}
								</span>
							</div>

							<ul className="mt-6 flex-1 space-y-4">
								{plan.features.map((f) => (
									<li
										key={f}
										className="flex items-start gap-3 text-[var(--text-secondary)]"
									>
										<Check
											className={`w-5 h-5 shrink-0 mt-0.5 ${plan.highlight ? "text-[var(--accent-primary)]" : "text-emerald-400"}`}
										/>
										<span>{f}</span>
									</li>
								))}
							</ul>

							<button
								type="button"
								disabled={plan.current}
								onClick={() =>
									plan.current
										? null
										: toast.info(
												`Redirecting to Stripe checkout for ${plan.name}...`,
											)
								}
								className={`mt-8 w-full rounded-xl py-4 font-bold transition-all ${
									plan.current
										? "bg-[var(--bg-main)] border border-[var(--border-glass)] text-[var(--text-muted)] cursor-not-allowed"
										: plan.highlight
											? "bg-[var(--accent-primary)] text-[#050505] hover:opacity-90 shadow-lg shadow-[var(--accent-primary)]/20"
											: "bg-[var(--bg-main)] border border-[var(--border-glass)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
								}`}
							>
								{plan.cta}
							</button>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
