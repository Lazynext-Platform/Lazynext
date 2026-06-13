// Centralized SEO metadata for lazynext.com

export const SITE_CONFIG = {
	name: "Lazynext",
	shortName: "Lazynext",
	description: "AI-powered video editing platform. Describe your edit in natural language and watch our multi-model AI agent execute it. 18 AI providers, Rust-powered compositor, 6 platform formats.",
	url: "https://lazynext.com",
	ogImage: "https://lazynext.com/og-image.png",
	twitterImage: "https://lazynext.com/twitter-image.png",
	twitterHandle: "@lazynext",
	locale: "en_US",
	themeColor: "#00e5ff",
	backgroundColor: "#09090b",
};

export function generateMetadata({
	title,
	description,
	path = "",
	image,
	type = "website",
}: {
	title?: string;
	description?: string;
	path?: string;
	image?: string;
	type?: "website" | "article";
}) {
	const fullTitle = title ? `${title} — ${SITE_CONFIG.name}` : `${SITE_CONFIG.name} — AI Video Editing Platform`;
	const fullDescription = description ?? SITE_CONFIG.description;
	const url = `${SITE_CONFIG.url}${path}`;
	const ogImage = image ?? SITE_CONFIG.ogImage;

	return {
		// Basic
		title: fullTitle,
		description: fullDescription,
		metadataBase: new URL(SITE_CONFIG.url),
		alternates: { canonical: url },

		// Open Graph (Facebook, LinkedIn, Discord, etc.)
		openGraph: {
			type,
			siteName: SITE_CONFIG.name,
			title: fullTitle,
			description: fullDescription,
			url,
			images: [{ url: ogImage, width: 1200, height: 630, alt: fullTitle }],
			locale: SITE_CONFIG.locale,
		},

		// Twitter Card
		twitter: {
			card: "summary_large_image" as const,
			site: SITE_CONFIG.twitterHandle,
			creator: SITE_CONFIG.twitterHandle,
			title: fullTitle,
			description: fullDescription,
			images: [image ?? SITE_CONFIG.twitterImage],
		},

		// Additional
		robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
		applicationName: SITE_CONFIG.name,
		appleWebApp: { capable: true, title: SITE_CONFIG.shortName, statusBarStyle: "black-translucent" as const },
		formatDetection: { telephone: false },
	};
}
