/**
 * Superadmin panel — system monitoring, user management, and analytics.
 *
 * @page /superadmin
 * @module superadmin/page
 */

import { Header } from "@/components/header";
import Link from "next/link";
import {
	Activity,
	Server,
	Cpu,
	AlertTriangle,
	TerminalSquare,
	ShieldAlert,
} from "lucide-react";

import { adminData } from "@/lib/admin-data";

export default async function SuperAdminDashboard() {
	const metrics = await adminData.getAdminMetrics();
	const systemStatus = await adminData.getSystemStatus();
	const aiMetrics = await adminData.getAIProviderMetrics();

	return (
		<div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)]">
			<Header />

			<div className="flex flex-col md:flex-row max-w-7xl mx-auto py-8 px-4 gap-8">
				{/* Sidebar Nav */}
				<aside className="w-full md:w-64 flex-shrink-0">
					<nav className="flex flex-col gap-2">
						<Link
							href="/superadmin/analytics"
							className="flex items-center gap-3 px-4 py-3 bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)] rounded-lg font-medium border border-[var(--accent-secondary)]/20 hover:bg-[var(--accent-secondary)]/20 transition-colors"
						>
							<Activity className="w-5 h-5" />
							Global Telemetry
						</Link>
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
								<h1 className="text-3xl font-bold tracking-tight text-foreground">
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
							<button className="bg-red-600 text-foreground px-4 py-2 rounded-lg font-medium hover:bg-red-500 transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)]">
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
								Total Users
							</h3>
							<p className="text-4xl font-black mt-2 text-[var(--accent-primary)]">
								{metrics.totalUsers.toLocaleString()}
							</p>
						</div>
						<div className="bg-[var(--bg-panel)] border border-[var(--border-glass)] p-5 rounded-xl flex flex-col justify-between">
							<h3 className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">
								Paid Subscribers
							</h3>
							<p className="text-4xl font-black mt-2 text-amber-400">
								{metrics.activeSubscriptions}
							</p>
						</div>
						<div className="bg-[var(--bg-panel)] border border-[var(--border-glass)] p-5 rounded-xl flex flex-col justify-between">
							<h3 className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">
								Total Projects
							</h3>
							<p className="text-4xl font-black mt-2 text-foreground">
								{metrics.totalProjects.toLocaleString()}
							</p>
						</div>
						<div className="bg-[var(--bg-panel)] border border-[var(--border-glass)] p-5 rounded-xl flex flex-col justify-between">
							<h3 className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">
								Est. MRR
							</h3>
							<p className="text-4xl font-black mt-2 text-emerald-400">
								${(metrics.monthlyRecurringRevenue / 1000).toFixed(0)}K
							</p>
						</div>
					</div>

					{/* AI Matrix */}
					<h2 className="text-xl font-bold mt-6 flex items-center gap-2">
						<Cpu className="w-5 h-5 text-[var(--accent-primary)]" />
						AI Provider Status
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
								{aiMetrics.map((provider) => (
									<tr key={provider.name} className="hover:bg-[var(--bg-hover)] transition-colors">
										<td className="px-6 py-4 font-medium text-foreground flex items-center gap-2">
											<div
												className="w-2 h-2 rounded-full"
												style={{ backgroundColor: provider.colorHex }}
											></div>
											{provider.name}
										</td>
										<td className="px-6 py-4">
											{provider.requestsPerMin?.toLocaleString() ?? "—"}
										</td>
										<td className="px-6 py-4">
											{provider.avgLatencyMs != null ? `${provider.avgLatencyMs}ms` : "—"}
										</td>
										<td className="px-6 py-4">
											<span className={`px-2 py-1 text-[10px] border rounded ${
												provider.status === "Operational" || provider.status === "Local Fast"
													? "bg-green-500/10 text-green-400 border-green-500/20"
													: provider.status === "Degraded"
													? "bg-amber-500/10 text-amber-400 border-amber-500/20"
													: provider.status === "Failing"
													? "bg-red-500/10 text-red-400 border-red-500/20"
													: "bg-gray-500/10 text-gray-400 border-gray-500/20"
											}`}>
												{provider.status}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Monitoring Section */}
					<div className="mt-4 bg-background border border-border rounded-xl overflow-hidden font-mono text-xs">
						<div className="bg-background px-4 py-2 border-b border-border flex items-center gap-2 text-muted">
							<TerminalSquare className="w-4 h-4" />
							System Status
						</div>
						<div className="p-4 space-y-1 text-foreground">
							<p>
								<span className="text-[var(--accent-primary)]">[INFO]</span>{" "}
								Runtime metrics (Rust nodes, FFmpeg queue) available via{" "}
								<a
									href="http://localhost:3001"
									className="text-[var(--accent-secondary)] underline"
								>
									Grafana Dashboard
								</a>
							</p>
							<p>
								<span className="text-green-500">[DB]</span> Total users:{" "}
								{metrics.totalUsers} • Paid subscriptions:{" "}
								{metrics.activeSubscriptions} • Projects:{" "}
								{metrics.totalProjects}
							</p>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
