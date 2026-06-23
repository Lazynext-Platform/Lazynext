"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		// Only initialize if we have the key, to avoid breaking local dev if undefined
		if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
			posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
				api_host:
					process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
				capture_pageview: false, // We'll handle this manually in Next.js if needed
				capture_pageleave: true,
			});
		}
	}, []);

	return <PHProvider client={posthog}>{children}</PHProvider>;
}
