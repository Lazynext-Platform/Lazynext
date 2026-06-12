"use client";

import React from "react";

interface AuthCardProps {
	title: string;
	subtitle: string;
	children: React.ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
	return (
		<div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-2xl backdrop-blur-sm">
			<div className="mb-8 text-center">
				<h1 className="text-2xl font-bold text-white">{title}</h1>
				<p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
			</div>
			{children}
		</div>
	);
}
