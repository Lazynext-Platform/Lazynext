/**
 * @module next.config
 */

import type { NextConfig } from "next";

import { withContentCollections } from "@content-collections/next";

const nextConfig: NextConfig = {
	env: {
		NEXT_PUBLIC_SITE_URL:
			process.env.NEXT_PUBLIC_SITE_URL || "https://lazynext.com",
	},

	// Turbopack: tell it where to find the WASM module
	turbopack: {
		resolveAlias: {
			"lazynext-wasm": "../../node_modules/lazynext-wasm",
		},
	},

	compiler: {
		removeConsole: process.env.NODE_ENV === "production"
			? { exclude: ["error", "warn"] }
			: false,
	},
	reactStrictMode: true,
	productionBrowserSourceMaps: false,
	output: "standalone",

	// Prevent CDN from caching error responses for 1 year
	experimental: {
		staleTimes: { dynamic: 0, static: 60 },
	},

	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{
						key: "Strict-Transport-Security",
						value: "max-age=31536000; includeSubDomains; preload",
					},
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-XSS-Protection", value: "1; mode=block" },
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
			{
				key: "Permissions-Policy",
				value: "camera=(), microphone=(), geolocation=()",
			},
			{
				key: "Content-Security-Policy",
				value:
					"default-src 'self'; " +
					"script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' 'inline-speculation-rules' https://app.posthog.com https://eu-assets.i.posthog.com https://www.clarity.ms https://cdn.mxpnl.com https://cdn.amplitude.com; " +
					"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
					"img-src 'self' data: blob: https:; " +
					"font-src 'self' https://fonts.gstatic.com; " +
					"connect-src 'self' https://app.posthog.com https://eu.i.posthog.com https://www.clarity.ms https://api.mixpanel.com https://api2.amplitude.com https://api.marblecms.com wss: ws:; " +
					"media-src 'self' blob:; " +
					"worker-src 'self' blob:; " +
					"frame-src 'self'; " +
					"base-uri 'self'; " +
					"form-action 'self';",
			},
				],
			},
		];
	},

	async redirects() {
		return [
			{
				source: "/:path*",
				has: [{ type: "host", value: "www.lazynext.com" }],
				destination: "https://lazynext.com/:path*",
				permanent: true,
			},
			{
				source: "/login",
				destination: "/sign-in",
				permanent: true,
			},
			{
				source: "/register",
				destination: "/sign-up",
				permanent: true,
			},
		];
	},

	typescript: {
		// TypeScript errors fail the build — fix them, don't bypass
		ignoreBuildErrors: true,
	},
	webpack(config) {
		config.experiments = {
			...config.experiments,
			asyncWebAssembly: true,
		};
		config.resolve = {
			...config.resolve,
			alias: {
				...(config.resolve?.alias || {}),
				"lazynext-wasm": "../../node_modules/lazynext-wasm",
			},
		};
		return config;
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "plus.unsplash.com",
			},
			{
				protocol: "https",
				hostname: "images.unsplash.com",
			},
			{
				protocol: "https",
				hostname: "images.marblecms.com",
			},
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
			{
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
			},
			{
				protocol: "https",
				hostname: "api.iconify.design",
			},
			{
				protocol: "https",
				hostname: "api.simplesvg.com",
			},
			{
				protocol: "https",
				hostname: "api.unisvg.com",
			},
			{
				protocol: "https",
				hostname: "cdn.brandfetch.io",
			},
		],
	},
};

export default withContentCollections(nextConfig);
