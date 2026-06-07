import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "API Documentation — Lazynext",
	description: "Developer documentation for the Lazynext AI Video Editing API.",
};

const ENDPOINTS = [
	{ method: "GET", path: "/api/health", desc: "Health check endpoint" },
	{ method: "GET", path: "/api/user/profile", desc: "Get current user profile", auth: true },
	{ method: "PATCH", path: "/api/user/profile", desc: "Update user profile", auth: true },
	{ method: "POST", path: "/api/chat", desc: "Send a prompt to the AI agent", auth: true },
	{ method: "GET", path: "/api/projects", desc: "List all projects", auth: true },
	{ method: "POST", path: "/api/projects", desc: "Create a new project", auth: true },
	{ method: "GET", path: "/api/projects/:id", desc: "Get project by ID", auth: true },
	{ method: "PATCH", path: "/api/projects/:id", desc: "Update project", auth: true },
	{ method: "DELETE", path: "/api/projects/:id", desc: "Delete project", auth: true },
	{ method: "POST", path: "/api/stripe/checkout", desc: "Create Stripe checkout session", auth: true },
	{ method: "POST", path: "/api/auth/forgot-password", desc: "Request password reset email" },
	{ method: "POST", path: "/api/auth/reset-password", desc: "Reset password with token" },
	{ method: "GET", path: "/api/sounds/search", desc: "Search freesound library" },
	{ method: "GET", path: "/rss.xml", desc: "RSS feed for blog" },
	{ method: "GET", path: "/sitemap.xml", desc: "XML sitemap" },
];

export default function DocsPage() {
	return (
		<div className="min-h-screen bg-zinc-950 text-zinc-100">
			<div className="mx-auto max-w-4xl px-4 py-16">
				<h1 className="text-4xl font-bold text-white">API Documentation</h1>
				<p className="mt-2 text-zinc-400">Complete reference for the Lazynext API endpoints.</p>

				<section className="mt-10">
					<h2 className="text-xl font-semibold text-white">Authentication</h2>
					<p className="mt-2 text-sm text-zinc-400">
						Most endpoints require authentication via Better Auth session cookies.
						Use <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-violet-400">/sign-in</code> or{" "}
						<code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-violet-400">/sign-up</code>{" "}
						to create an account.
					</p>
				</section>

				<section className="mt-10">
					<h2 className="text-xl font-semibold text-white">Endpoints</h2>
					<div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">
						{ENDPOINTS.map((ep) => (
							<div key={ep.path + ep.method} className="flex items-center gap-4 border-b border-zinc-800 px-5 py-3 last:border-none">
								<span className={`rounded px-2 py-0.5 text-xs font-bold ${
									ep.method === "GET" ? "bg-emerald-500/20 text-emerald-400" :
									ep.method === "POST" ? "bg-blue-500/20 text-blue-400" :
									ep.method === "PATCH" ? "bg-amber-500/20 text-amber-400" :
									"bg-red-500/20 text-red-400"
								}`}>{ep.method}</span>
								<code className="flex-1 text-sm text-zinc-200">{ep.path}</code>
								<span className="text-xs text-zinc-500">{ep.desc}</span>
								{ep.auth && <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">🔒 Auth</span>}
							</div>
						))}
					</div>
				</section>

				<section className="mt-10">
					<h2 className="text-xl font-semibold text-white">AI Agent Chat</h2>
					<p className="mt-2 text-sm text-zinc-400">
						Send prompts to the multi-model AI agent. Supports Anthropic, OpenAI, Gemini, and Ollama backends.
					</p>
					<div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
						<pre className="text-xs text-zinc-300 overflow-x-auto">
{`POST /api/chat
Content-Type: application/json

{
  "prompt": "Cut the silence and add a cinematic color grade",
  "projectId": "proj_xxx"
}`}
						</pre>
					</div>
				</section>

				<section className="mt-10">
					<h2 className="text-xl font-semibold text-white">FFMPEG Filter Engine</h2>
					<p className="mt-2 text-sm text-zinc-400">
						The Rust-based <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs text-violet-400">ffmpeg_filter</code> crate
						provides type-safe filter_complex graph construction. See{" "}
						<code className="rounded bg-zinc-800 px-1 py-0.5 text-xs text-violet-400">rust/crates/ffmpeg_filter/</code>.
					</p>
				</section>
			</div>
		</div>
	);
}
