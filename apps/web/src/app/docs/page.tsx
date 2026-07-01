/**
 * API documentation page with generated SEO metadata.
 *
 * @page /docs
 */

import { generateMetadata } from "@/seo/metadata";

export const metadata = generateMetadata({
	title: "API Documentation",
	description:
		"Complete API reference for Lazynext. 15 endpoints, AI agent chat, Stripe checkout, user profile, FFMPEG filter engine. REST API with Better Auth.",
	path: "/docs",
});

const ENDPOINTS = [
	{ m: "GET", p: "/api/health", d: "Health check" },
	{ m: "GET", p: "/api/user/profile", d: "Get user profile", a: true },
	{ m: "PATCH", p: "/api/user/profile", d: "Update profile", a: true },
	{ m: "POST", p: "/api/chat", d: "AI agent prompt", a: true },
	{ m: "GET", p: "/api/projects", d: "List projects", a: true },
	{ m: "POST", p: "/api/projects", d: "Create project", a: true },
	{ m: "POST", p: "/api/stripe/checkout", d: "Stripe checkout", a: true },
	{ m: "POST", p: "/api/auth/forgot-password", d: "Password reset request" },
	{ m: "POST", p: "/api/auth/reset-password", d: "Reset password" },
];

export default function DocsPage() {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<div className="mx-auto max-w-4xl px-4 py-16">
				<h1 className="text-4xl font-bold text-foreground">
					API Documentation
				</h1>
				<p className="mt-2 text-muted">
					Complete reference for Lazynext API endpoints.
				</p>
				<section className="mt-10">
					<h2 className="text-xl font-semibold text-foreground">Endpoints</h2>
					<div className="mt-4 overflow-hidden rounded-xl border border-border">
						{ENDPOINTS.map((ep) => (
							<div
								key={ep.p + ep.m}
								className="flex items-center gap-4 border-b border-border px-5 py-3 last:border-none"
							>
								<span
									className={`rounded px-2 py-0.5 text-xs font-bold ${ep.m === "GET" ? "bg-emerald-500/20 text-emerald-400" : ep.m === "POST" ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"}`}
								>
									{ep.m}
								</span>
								<code className="flex-1 text-sm text-foreground">{ep.p}</code>
								<span className="text-xs text-muted">{ep.d}</span>
								{ep.a && (
									<span className="rounded bg-panel px-1.5 py-0.5 text-xs text-muted">
										Auth
									</span>
								)}
							</div>
						))}
					</div>
				</section>
			</div>
		</div>
	);
}
