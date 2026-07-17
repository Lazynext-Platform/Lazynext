/**
 * Admin dashboard — user metrics, billing overview, and system stats.
 *
 * @page /admin
 * @module admin/page
 */

import { getDashboardMetrics, getRecentUsers } from "@/app/actions/admin";
import { Users, CreditCard, Server } from "lucide-react";

export default async function AdminDashboard() {
	const metrics = await getDashboardMetrics();
	const users = await getRecentUsers();

	return (
		<div className="min-h-screen bg-background text-foreground max-w-6xl mx-auto space-y-8 p-4 pt-8">
			{/* Metric Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-panel border border-border p-6 rounded-2xl flex items-center gap-4">
					<div className="p-4 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-xl">
						<Users className="w-8 h-8" />
					</div>
					<div>
						<p className="text-muted text-sm">Total Users</p>
						<p className="text-3xl font-bold">{metrics.totalUsers}</p>
					</div>
				</div>

				<div className="bg-panel border border-border p-6 rounded-2xl flex items-center gap-4">
					<div className="p-4 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-xl">
						<CreditCard className="w-8 h-8" />
					</div>
					<div>
						<p className="text-muted text-sm">MRR (Monthly Revenue)</p>
						<p className="text-3xl font-bold">
							${metrics.monthlyRecurringRevenue}
						</p>
					</div>
				</div>

				<div className="bg-panel border border-border p-6 rounded-2xl flex items-center gap-4">
					<div className="p-4 bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)] rounded-xl">
						<Server className="w-8 h-8" />
					</div>
					<div>
						<p className="text-muted text-sm">Active Subscriptions</p>
						<p className="text-3xl font-bold">{metrics.activeSubscriptions}</p>
					</div>
				</div>
			</div>

			{/* Users Table */}
			<div className="bg-panel border border-border rounded-2xl overflow-hidden">
				<div className="p-6 border-b border-border">
					<h2 className="text-xl font-bold">Recent Users</h2>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead className="bg-background text-muted">
							<tr>
								<th className="px-6 py-4 font-medium">User ID</th>
								<th className="px-6 py-4 font-medium">Email</th>
								<th className="px-6 py-4 font-medium">Role</th>
								<th className="px-6 py-4 font-medium">Joined</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--border-glass)]">
							{users.map((user) => (
								<tr
									key={user.id}
									className="hover:bg-hover transition-colors"
								>
									<td className="px-6 py-4 text-secondary font-mono text-xs">
										{user.id}
									</td>
									<td className="px-6 py-4 font-medium">{user.email}</td>
									<td className="px-6 py-4">
										<span
											className={`px-2 py-1 rounded-full text-xs font-medium ${
												user.role === "admin"
													? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
													: "bg-background text-muted"
											}`}
										>
											{user.role}
										</span>
									</td>
									<td className="px-6 py-4 text-muted">
										{new Date(user.createdAt).toLocaleDateString()}
									</td>
								</tr>
							))}
							{users.length === 0 && (
								<tr>
									<td
										colSpan={4}
										className="px-6 py-8 text-center text-muted"
									>
										No users found.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
