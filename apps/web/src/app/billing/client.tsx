"use client";

import React from "react";
import { useSession } from "@/auth/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

const PLANS = [
	{
		name: "Free",
		price: "$0",
		period: "forever",
		features: ["1 project", "720p export", "Basic AI tools", "Community support"],
		cta: "Current Plan",
		current: true,
	},
	{
		name: "Pro",
		price: "$19",
		period: "per month",
		features: ["Unlimited projects", "4K export", "Advanced AI tools", "Priority support", "Custom fonts", "Cloud storage 50GB"],
		cta: "Upgrade to Pro",
		highlight: true,
	},
	{
		name: "Studio",
		price: "$49",
		period: "per month",
		features: ["Everything in Pro", "8K export", "Team collaboration", "API access", "Custom AI models", "Cloud storage 500GB", "Dedicated support"],
		cta: "Upgrade to Studio",
	},
];

export function BillingPageClient() {
	const { data: session, isPending } = useSession();
	const router = useRouter();

	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-zinc-950">
				<div className="text-zinc-400">Loading...</div>
			</div>
		);
	}

	if (!session) {
		router.push("/sign-in");
		return null;
	}

	return (
		<div className="min-h-screen bg-zinc-950 text-zinc-100">
			<div className="mx-auto max-w-5xl px-4 py-16">
				<Link
					href="/projects"
					className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
				>
					← Back to Projects
				</Link>

				<div className="mb-12 text-center">
					<h1 className="text-4xl font-bold text-white">Billing & Plans</h1>
					<p className="mt-3 text-zinc-400">Choose the right plan for your creative workflow.</p>
				</div>

				{/* Plans Grid */}
				<div className="grid gap-6 md:grid-cols-3">
					{PLANS.map((plan) => (
						<div
							key={plan.name}
							className={`relative rounded-2xl border p-6 ${
								plan.highlight
									? "border-violet-500/50 bg-violet-500/5 shadow-[0_0_30px_rgba(139,92,246,0.15)]"
									: "border-zinc-800 bg-zinc-900/50"
							}`}
						>
							{plan.highlight && (
								<div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-0.5 text-xs font-semibold text-white">
									Most Popular
								</div>
							)}
							<h3 className="text-lg font-semibold text-white">{plan.name}</h3>
							<div className="mt-3">
								<span className="text-4xl font-bold text-white">{plan.price}</span>
								<span className="ml-1 text-sm text-zinc-400">{plan.period}</span>
							</div>
							<ul className="mt-6 space-y-2">
								{plan.features.map((f) => (
									<li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
										<svg className="h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
										</svg>
										{f}
									</li>
								))}
							</ul>
							<button
								type="button"
								disabled={plan.current}
								onClick={() => plan.current ? null : toast.info(`Stripe checkout coming soon. ${plan.name} plan selected.`)}
								className={`mt-6 w-full rounded-lg py-2.5 text-sm font-semibold transition-colors ${
									plan.current
										? "border border-zinc-700 bg-zinc-800 text-zinc-500 cursor-default"
										: plan.highlight
											? "bg-violet-600 text-white hover:bg-violet-500"
											: "border border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700"
								}`}
							>
								{plan.cta}
							</button>
						</div>
					))}
				</div>

				{/* Payment History */}
				<section className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
					<h2 className="text-lg font-semibold text-white">Payment History</h2>
					<div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-8 text-center">
						<p className="text-sm text-zinc-500">No payments yet. Upgrade to a paid plan to see your history here.</p>
					</div>
				</section>
			</div>
		</div>
	);
}
