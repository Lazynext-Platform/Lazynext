/** @module Admin dashboard stat card component for displaying metrics with optional trend and icon */

import React from "react";

interface StatCardProps {
	/** Card title / metric label. */
	title: string;
	/** Metric value to display. */
	value: string | number;
	/** Optional trend indicator text. */
	trend?: string;
	/** Optional icon element. */
	icon?: React.ReactNode;
}

export function StatCard({ title, value, trend, icon }: StatCardProps) {
	return (
		<div className="p-6 rounded-xl bg-[--bg-card] border border-[--border-primary] shadow-sm flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-medium text-[--text-secondary]">{title}</h3>
				{icon && <div className="text-[--accent-primary]">{icon}</div>}
			</div>
			<div className="flex items-baseline gap-2">
				<span className="text-2xl font-bold text-[--text-primary]">
					{value}
				</span>
				{trend && (
					<span className="text-xs font-medium text-[--accent-primary]">
						{trend}
					</span>
				)}
			</div>
		</div>
	);
}
