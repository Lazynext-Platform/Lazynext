import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";
import { withContentCollections } from "@content-collections/next";

const nextConfig: NextConfig = {
		env: {
			NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "https://lazynext.com",
		},

	compiler: {
		removeConsole: process.env.NODE_ENV === "production",
	},
	reactStrictMode: true,
	productionBrowserSourceMaps: true,
	output: "standalone",

		// Prevent CDN from caching error responses for 1 year
		experimental: {
			staleTimes: { dynamic: 0, static: 60 },
		},


		async headers() {
			return [{
				source: "/(.*)",
				headers: [
					{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-XSS-Protection", value: "1; mode=block" },
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
					{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
				],
			}];
		},

		async redirects() {
			return [{
				source: "/:path*",
				has: [{ type: "host", value: "www.lazynext.com" }],
				destination: "https://lazynext.com/:path*",
				permanent: true,
			}];
		},

	
	
	
	typescript: {
		ignoreBuildErrors: true,
	},
	serverExternalPackages: ["kysely", "@better-auth/kysely-adapter"],
	webpack(config) {
		config.experiments = {
			...config.experiments,
			asyncWebAssembly: true,
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

export default withContentCollections(withBotId(nextConfig));
