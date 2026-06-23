"use client";

import { useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function BillingPage() {
	const [loading, setLoading] = useState(false);

	const handleUpgrade = async () => {
		setLoading(true);
		try {
			const response = await fetch("/api/stripe/checkout", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "price_12345",
				}),
			});

			const data = await response.json();

			if (data.url) {
				window.location.href = data.url;
			} else {
				throw new Error("Failed to create checkout session");
			}
		} catch (error) {
			toast.error("Something went wrong. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
			<div className="max-w-md w-full glass-panel bg-neutral-100/50 dark:bg-neutral-900/50 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
				{/* Decorative glass gradient */}
				<div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

				<div className="flex items-center gap-3 mb-6 relative z-10">
					<div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl">
						<Sparkles className="w-6 h-6" />
					</div>
					<h1 className="text-3xl font-bold tracking-tight">Lazynext Pro</h1>
				</div>

				<p className="text-neutral-600 dark:text-neutral-400 mb-8 relative z-10">
					Unlock the full power of the AI autonomous NLE. Render in 4K,
					collaborate with infinite teammates, and access the Visionary AI
					Agent.
				</p>

				<div className="space-y-4 mb-8 relative z-10">
					{[
						"Unlimited 4K Exports",
						"Real-Time Multiplayer Sync",
						"Visionary AI Director Agent",
						"100GB Cloud Storage",
					].map((feature, i) => (
						<div
							key={i}
							className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300"
						>
							<CheckCircle2 className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
							<span>{feature}</span>
						</div>
					))}
				</div>

				<button
					onClick={handleUpgrade}
					disabled={loading}
					className="w-full relative z-10 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] disabled:opacity-50"
				>
					{loading ? "Processing..." : "Upgrade to Pro - $29/mo"}
				</button>
			</div>
		</div>
	);
}
