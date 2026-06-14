import { Header } from "@/components/header";
import {
	Activity,
	Server,
	Cpu,
	AlertTriangle,
	TerminalSquare,
	ShieldAlert,
} from "lucide-react";

import { mockDb } from "@/lib/mock-db";

export default async function SuperAdminDashboard() {
	const telemetry = await mockDb.getGlobalTelemetry();
	const aiMetrics = await mockDb.getAIProviderMetrics();

	return (
		<div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)]">
			<Header />

			<div className="flex flex-col md:flex-row max-w-7xl mx-auto py-8 px-4 gap-8">
				{/* Sidebar Nav */}
				<aside className="w-full md:w-64 flex-shrink-0">
					<nav className="flex flex-col gap-2">
						<a
							href="#"
							className="flex items-center gap-3 px-4 py-3 bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)] rounded-lg font-medium border border-[var(--accent-secondary)]/20"
						>
							<Activity className="w-5 h-5" />
							Global Telemetry
						</a>
						<a
							href="#"
							className="flex items-center gap-3 px-4 py-3 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] rounded-lg transition-colors"
						>
							<Server className="w-5 h-5" />
							Render Farm Nodes
						</a>
						<a
							href="#"
							className="flex items-center gap-3 px-4 py-3 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] rounded-lg transition-colors"
						>
							<Cpu className="w-5 h-5" />
							AI Model Routing
						</a>
						<a
							href="#"
							className="flex items-center gap-3 px-4 py-3 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] rounded-lg transition-colors"
						>
							<ShieldAlert className="w-5 h-5" />
							User Moderation
						</a>
					</nav>
				</aside>

				{/* Main Content Area */}
				<main className="flex-1 flex flex-col gap-6">
					<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border-glass)] pb-6">
						<div>
							<div className="flex items-center gap-3">
								<h1 className="text-3xl font-bold tracking-tight text-white">
									Platform God Mode
								</h1>
								<span className="bg-red-500/20 text-red-500 border border-red-500/50 text-xs px-2 py-0.5 rounded animate-pulse font-bold">
									LIVE
								</span>
							</div>
							<p className="text-[var(--text-muted)] mt-1">
								Lazynext Multi-Format SaaS Telemetry.
							</p>
						</div>
						<div className="flex gap-3">
							<button className="bg-[var(--bg-panel)] border border-[var(--border-glass)] text-[var(--text-primary)] px-4 py-2 rounded-lg font-medium hover:bg-[var(--bg-hover)] transition-colors">
								Export Logs
							</button>
							<button className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-500 transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)]">
								Emergency Halt
							</button>
						</div>
					</div>

					{/* Infrastructure Health */}
					<h2 className="text-xl font-bold mt-2 flex items-center gap-2">
						<Server className="w-5 h-5 text-[var(--accent-secondary)]" />
						Infrastructure Health
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
						<div className="bg-[var(--bg-panel)] border border-[var(--border-glass)] p-5 rounded-xl flex flex-col justify-between">
							<h3 className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">
								Active Rust Nodes
							</h3>
							<p className="text-4xl font-black mt-2 text-[var(--accent-primary)]">
								34
							</p>
							<div className="w-full bg-[var(--bg-main)] h-1.5 mt-4 rounded-full overflow-hidden">
								<div className="bg-[var(--accent-primary)] h-full w-[85%]"></div>
							</div>
						</div>
						<div className="bg-[var(--bg-panel)] border border-[var(--border-glass)] p-5 rounded-xl flex flex-col justify-between">
							<h3 className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">
								FFmpeg Export Queue
							</h3>
							<p className="text-4xl font-black mt-2 text-amber-400">142</p>
							<p className="text-[10px] text-[var(--text-muted)] mt-2 flex items-center gap-1">
								<AlertTriangle className="w-3 h-3 text-amber-400" /> Scaling
								required soon
							</p>
						</div>
						<div className="bg-[var(--bg-panel)] border border-[var(--border-glass)] p-5 rounded-xl flex flex-col justify-between">
							<h3 className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">
								Total Active Users
							</h3>
							<p className="text-4xl font-black mt-2 text-white">8,492</p>
							<p className="text-[10px] text-green-400 mt-2">+12% this hour</p>
						</div>
						<div className="bg-[var(--bg-panel)] border border-[var(--border-glass)] p-5 rounded-xl flex flex-col justify-between">
							<h3 className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">
								Total MRR
							</h3>
							<p className="text-4xl font-black mt-2 text-emerald-400">$42K</p>
							<p className="text-[10px] text-emerald-400/80 mt-2">
								Stripe Sync Active
							</p>
						</div>
					</div>

					{/* AI Matrix */}
					<h2 className="text-xl font-bold mt-6 flex items-center gap-2">
						<Cpu className="w-5 h-5 text-[var(--accent-primary)]" />
						18-Model AI Provider Matrix
					</h2>
					<div className="bg-[var(--bg-panel)] border border-[var(--border-glass)] rounded-xl overflow-hidden">
						<table className="w-full text-sm text-left">
							<thead className="text-xs text-[var(--text-muted)] uppercase bg-[var(--bg-main)] border-b border-[var(--border-glass)]">
								<tr>
									<th className="px-6 py-3">Provider / Model</th>
									<th className="px-6 py-3">Requests / Min</th>
									<th className="px-6 py-3">Avg Latency</th>
									<th className="px-6 py-3">Status</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--border-glass)]">
								<tr className="hover:bg-[var(--bg-hover)] transition-colors">
									<td className="px-6 py-4 font-medium text-white flex items-center gap-2">
										<div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
										Anthropic Claude 3.5 Sonnet
									</td>
									<td className="px-6 py-4">1,402</td>
									<td className="px-6 py-4 text-green-400">420ms</td>
									<td className="px-6 py-4">
										<span className="px-2 py-1 text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 rounded">
											Operational
										</span>
									</td>
								</tr>
								<tr className="hover:bg-[var(--bg-hover)] transition-colors">
									<td className="px-6 py-4 font-medium text-white flex items-center gap-2">
										<div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
										OpenAI GPT-4o
									</td>
									<td className="px-6 py-4">940</td>
									<td className="px-6 py-4 text-green-400">510ms</td>
									<td className="px-6 py-4">
										<span className="px-2 py-1 text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 rounded">
											Operational
										</span>
									</td>
								</tr>
								<tr className="hover:bg-[var(--bg-hover)] transition-colors">
									<td className="px-6 py-4 font-medium text-white flex items-center gap-2">
										<div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
										Google Gemini 1.5 Pro
									</td>
									<td className="px-6 py-4">420</td>
									<td className="px-6 py-4 text-amber-400">1200ms</td>
									<td className="px-6 py-4">
										<span className="px-2 py-1 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
											Degraded
										</span>
									</td>
								</tr>
								<tr className="hover:bg-[var(--bg-hover)] transition-colors">
									<td className="px-6 py-4 font-medium text-white flex items-center gap-2">
										<div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></div>
										Local Ollama (Llama 3)
									</td>
									<td className="px-6 py-4">89</td>
									<td className="px-6 py-4 text-green-400">150ms</td>
									<td className="px-6 py-4">
										<span className="px-2 py-1 text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 rounded">
											Local Fast
										</span>
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					{/* Terminal Console */}
					<div className="mt-4 bg-black border border-zinc-800 rounded-xl overflow-hidden font-mono text-xs">
						<div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center gap-2 text-zinc-400">
							<TerminalSquare className="w-4 h-4" />
							Live Platform Logs
						</div>
						<div className="p-4 h-48 overflow-y-auto space-y-1 text-zinc-300">
							<p>
								<span className="text-green-500">[INFO]</span> New user sign-up:
								vaspatel@gmail.com
							</p>
							<p>
								<span className="text-[var(--accent-primary)]">[SYSTEM]</span>{" "}
								Spawning 3 new Rust compositor instances...
							</p>
							<p>
								<span className="text-amber-500">[WARN]</span> FFmpeg worker #42
								timeout parsing 8K H.265
							</p>
							<p>
								<span className="text-green-500">[INFO]</span> Processed 12 tool
								calls from Claude 3.5 Agent
							</p>
							<p>
								<span className="text-blue-400">[STRIPE]</span> Webhook
								received: invoice.payment_succeeded for $19.00
							</p>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
