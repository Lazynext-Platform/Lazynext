import { getDashboardMetrics, getRecentUsers } from "@/app/actions/admin";
import { Users, CreditCard, Server } from "lucide-react";

export default async function AdminDashboard() {
	const metrics = await getDashboardMetrics();
	const users = await getRecentUsers();

	return (
		<div className="max-w-6xl mx-auto space-y-8">
			{/* Metric Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-2xl flex items-center gap-4">
					<div className="p-4 bg-cyan-500/10 text-cyan-400 rounded-xl">
						<Users className="w-8 h-8" />
					</div>
					<div>
						<p className="text-neutral-400 text-sm">Total Users</p>
						<p className="text-3xl font-bold">{metrics.totalUsers}</p>
					</div>
				</div>

				<div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-2xl flex items-center gap-4">
					<div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-xl">
						<CreditCard className="w-8 h-8" />
					</div>
					<div>
						<p className="text-neutral-400 text-sm">MRR (Monthly Revenue)</p>
						<p className="text-3xl font-bold">
							${metrics.monthlyRecurringRevenue}
						</p>
					</div>
				</div>

				<div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-2xl flex items-center gap-4">
					<div className="p-4 bg-purple-500/10 text-purple-400 rounded-xl">
						<Server className="w-8 h-8" />
					</div>
					<div>
						<p className="text-neutral-400 text-sm">Active Subscriptions</p>
						<p className="text-3xl font-bold">{metrics.activeSubscriptions}</p>
					</div>
				</div>
			</div>

			{/* Users Table */}
			<div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden">
				<div className="p-6 border-b border-neutral-800">
					<h2 className="text-xl font-bold">Recent Users</h2>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead className="bg-neutral-900 text-neutral-400">
							<tr>
								<th className="px-6 py-4 font-medium">User ID</th>
								<th className="px-6 py-4 font-medium">Email</th>
								<th className="px-6 py-4 font-medium">Role</th>
								<th className="px-6 py-4 font-medium">Joined</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-neutral-800">
							{users.map((user) => (
								<tr
									key={user.id}
									className="hover:bg-neutral-800/50 transition-colors"
								>
									<td className="px-6 py-4 text-neutral-300 font-mono text-xs">
										{user.id}
									</td>
									<td className="px-6 py-4 font-medium">{user.email}</td>
									<td className="px-6 py-4">
										<span
											className={`px-2 py-1 rounded-full text-xs font-medium ${
												user.role === "admin"
													? "bg-cyan-500/20 text-cyan-400"
													: "bg-neutral-800 text-neutral-400"
											}`}
										>
											{user.role}
										</span>
									</td>
									<td className="px-6 py-4 text-neutral-400">
										{new Date(user.createdAt).toLocaleDateString()}
									</td>
								</tr>
							))}
							{users.length === 0 && (
								<tr>
									<td
										colSpan={4}
										className="px-6 py-8 text-center text-neutral-500"
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
