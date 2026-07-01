/**
 * Superadmin analytics — charts, metrics, and usage dashboards.
 *
 * @page /superadmin/analytics
 */

"use client";

import { Header } from "@/components/header";
import {
	Activity,
	ArrowLeft,
	Server,
	TrendingUp,
	Users,
	Zap,
} from "lucide-react";
import Link from "next/link";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

const MOCK_VELOCITY_DATA = [
	{ time: "00:00", events: 1200 },
	{ time: "04:00", events: 800 },
	{ time: "08:00", events: 3400 },
	{ time: "12:00", events: 5600 },
	{ time: "16:00", events: 7200 },
	{ time: "20:00", events: 4500 },
	{ time: "24:00", events: 2100 },
];

const MOCK_TOP_EVENTS = [
	{ name: "Video Render", count: 12400 },
	{ name: "AI Prompt", count: 9800 },
	{ name: "User Login", count: 6500 },
	{ name: "Project Create", count: 4200 },
	{ name: "Export", count: 3100 },
];

const MOCK_PLATFORM_DATA = [
	{ name: "Web (Next.js)", value: 65 },
	{ name: "Desktop (GPUI)", value: 35 },
];

const PIE_COLORS = ["#a855f7", "#3b82f6"];

export default function AnalyticsDashboard() {
	return (
		<div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)]">
			<Header />

			<div className="max-w-7xl mx-auto py-8 px-4">
				{/* Top Bar */}
				<div className="flex items-center gap-4 border-b border-[var(--border-glass)] pb-6 mb-8">
					<Link
						href="/superadmin"
						className="p-2 rounded-full hover:bg-[var(--bg-hover)] transition-colors border border-transparent hover:border-[var(--border-glass)]"
					>
						<ArrowLeft className="w-5 h-5 text-[var(--text-muted)]" />
					</Link>
					<div>
						<h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
							<Activity className="w-8 h-8 text-[var(--accent-secondary)]" />
							Analytics & Telemetry
						</h1>
						<p className="text-[var(--text-muted)] mt-1">
							Deep dive into Kafka-ingested event telemetry and product usage.
						</p>
					</div>
				</div>

				{/* KPI Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
					<div className="bg-[var(--bg-panel)] border border-[var(--border-glass)] p-5 rounded-xl">
						<div className="flex justify-between items-start">
							<h3 className="text-[var(--text-muted)] text-sm font-semibold">
								Daily Active Users
							</h3>
							<Users className="w-4 h-4 text-purple-400" />
						</div>
						<p className="text-3xl font-black mt-3">24,592</p>
						<p className="text-xs text-green-400 mt-2 flex items-center gap-1">
							<TrendingUp className="w-3 h-3" /> +14.2% from last week
						</p>
					</div>

					<div className="bg-[var(--bg-panel)] border border-[var(--border-glass)] p-5 rounded-xl">
						<div className="flex justify-between items-start">
							<h3 className="text-[var(--text-muted)] text-sm font-semibold">
								Event Ingestion Rate
							</h3>
							<Zap className="w-4 h-4 text-amber-400" />
						</div>
						<p className="text-3xl font-black mt-3">1.2k / sec</p>
						<p className="text-xs text-[var(--text-muted)] mt-2">
							Kafka topic: user_telemetry_events
						</p>
					</div>

					<div className="bg-[var(--bg-panel)] border border-[var(--border-glass)] p-5 rounded-xl">
						<div className="flex justify-between items-start">
							<h3 className="text-[var(--text-muted)] text-sm font-semibold">
								Average LTV
							</h3>
							<Activity className="w-4 h-4 text-green-400" />
						</div>
						<p className="text-3xl font-black mt-3">$142.50</p>
						<p className="text-xs text-green-400 mt-2 flex items-center gap-1">
							<TrendingUp className="w-3 h-3" /> +$4.20 this month
						</p>
					</div>

					<div className="bg-[var(--bg-panel)] border border-[var(--border-glass)] p-5 rounded-xl">
						<div className="flex justify-between items-start">
							<h3 className="text-[var(--text-muted)] text-sm font-semibold">
								Platform Churn (30d)
							</h3>
							<Server className="w-4 h-4 text-red-400" />
						</div>
						<p className="text-3xl font-black mt-3">2.4%</p>
						<p className="text-xs text-green-400 mt-2 flex items-center gap-1">
							<TrendingUp className="w-3 h-3 rotate-180" /> -0.4% improvement
						</p>
					</div>
				</div>

				{/* Charts Row 1 */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
					<div className="lg:col-span-2 bg-[var(--bg-panel)] border border-[var(--border-glass)] p-6 rounded-xl">
						<h3 className="text-lg font-bold mb-6">Global Event Velocity</h3>
						<div className="h-[300px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={MOCK_VELOCITY_DATA}>
									<defs>
										<linearGradient
											id="colorEvents"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
											<stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
										</linearGradient>
									</defs>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke="#333"
										vertical={false}
									/>
									<XAxis
										dataKey="time"
										stroke="#666"
										fontSize={12}
										tickLine={false}
										axisLine={false}
									/>
									<YAxis
										stroke="#666"
										fontSize={12}
										tickLine={false}
										axisLine={false}
										tickFormatter={(value) => `${value / 1000}k`}
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: "#111",
											borderColor: "#333",
											borderRadius: "8px",
										}}
										itemStyle={{ color: "#fff" }}
									/>
									<Area
										type="monotone"
										dataKey="events"
										stroke="#a855f7"
										strokeWidth={3}
										fillOpacity={1}
										fill="url(#colorEvents)"
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</div>

					<div className="bg-[var(--bg-panel)] border border-[var(--border-glass)] p-6 rounded-xl">
						<h3 className="text-lg font-bold mb-6">Platform Distribution</h3>
						<div className="h-[300px] w-full flex items-center justify-center">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie
										data={MOCK_PLATFORM_DATA}
										cx="50%"
										cy="50%"
										innerRadius={70}
										outerRadius={100}
										paddingAngle={5}
										dataKey="value"
										stroke="none"
									>
										{MOCK_PLATFORM_DATA.map((entry, index) => (
											<Cell
												key={`cell-${index}`}
												fill={PIE_COLORS[index % PIE_COLORS.length]}
											/>
										))}
									</Pie>
									<Tooltip
										contentStyle={{
											backgroundColor: "#111",
											borderColor: "#333",
											borderRadius: "8px",
										}}
									/>
								</PieChart>
							</ResponsiveContainer>
						</div>
						<div className="flex justify-center gap-6 mt-2">
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-full bg-purple-500"></div>
								<span className="text-sm text-[var(--text-muted)]">
									Web 65%
								</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-full bg-blue-500"></div>
								<span className="text-sm text-[var(--text-muted)]">
									Desktop 35%
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Charts Row 2 */}
				<div className="bg-[var(--bg-panel)] border border-[var(--border-glass)] p-6 rounded-xl">
					<h3 className="text-lg font-bold mb-6">Top Event Triggers</h3>
					<div className="h-[300px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={MOCK_TOP_EVENTS}
								layout="vertical"
								margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke="#333"
									horizontal={false}
								/>
								<XAxis
									type="number"
									stroke="#666"
									fontSize={12}
									tickLine={false}
									axisLine={false}
								/>
								<YAxis
									dataKey="name"
									type="category"
									stroke="#aaa"
									fontSize={12}
									tickLine={false}
									axisLine={false}
								/>
								<Tooltip
									cursor={{ fill: "rgba(255,255,255,0.05)" }}
									contentStyle={{
										backgroundColor: "#111",
										borderColor: "#333",
										borderRadius: "8px",
									}}
								/>
								<Bar
									dataKey="count"
									fill="#3b82f6"
									radius={[0, 4, 4, 0]}
									barSize={32}
								>
									{MOCK_TOP_EVENTS.map((entry, index) => (
										<Cell
											key={`cell-${index}`}
											fill={index === 0 ? "#a855f7" : "#3b82f6"}
										/>
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>
		</div>
	);
}
