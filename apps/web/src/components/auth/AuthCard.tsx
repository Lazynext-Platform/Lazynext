/**
 * Auth card — glassmorphic card wrapper for sign-in and sign-up forms
 * with Lazynext branding.
 *
 * @module components/auth/AuthCard
 */

"use client";

import React from "react";

interface AuthCardProps {
	title: string;
	subtitle: string;
	children: React.ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
	return (
		<div className="rounded-2xl border border-border bg-background/80 p-8 shadow-2xl backdrop-blur-sm">
			<div className="mb-8 text-center">
				<h1 className="text-2xl font-bold text-foreground">{title}</h1>
				<p className="mt-2 text-sm text-muted">{subtitle}</p>
			</div>
			{children}
		</div>
	);
}
