// Complete Schema.org structured data for all content types
import React from "react";

/* ── Organization ── */
export function OrganizationLD({ url = "https://lazynext.com" }: { url?: string }) {
	const schema = {
		"@context": "https://schema.org",
		"@type": "Organization",
		"@id": `${url}/#org`,
		name: "Lazynext",
		alternateName: "Lazynext AI Video Editor",
		url,
		logo: {
			"@type": "ImageObject",
			url: `${url}/logo.png`,
			width: 512, height: 512,
			caption: "Lazynext Logo",
		},
		description: "AI-powered video editing platform. Multi-model AI agents, Rust compositor, 6 platform formats, 18 AI providers.",
		foundingDate: "2025",
		founder: { "@type": "Person", name: "Avas Patel" },
		contactPoint: { "@type": "ContactPoint", email: "support@lazynext.com", contactType: "customer support", availableLanguage: ["English"] },
		sameAs: [
			"https://github.com/Lazynext-Corporation",
			"https://x.com/lazynext",
			"https://discord.gg/lazynext",
			"https://linkedin.com/company/lazynext",
		],
		address: { "@type": "PostalAddress", addressCountry: "US" },
	};
	return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

/* ── Software Application ── */
export function SoftwareAppLD({ url = "https://lazynext.com" }: { url?: string }) {
	const schema = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		"@id": `${url}/#app`,
		name: "Lazynext",
		applicationCategory: "MultimediaApplication",
		operatingSystem: "Web, macOS, Windows, Linux, iOS, Android",
		offers: [
			{ "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
			{ "@type": "Offer", name: "Pro", price: "19", priceCurrency: "USD", unitText: "/month" },
			{ "@type": "Offer", name: "Studio", price: "49", priceCurrency: "USD", unitText: "/month" },
		],
		aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", ratingCount: "128", bestRating: "5" },
		featureList: "AI-powered editing, Multi-model AI agents, Rust compositor, 4K/8K export, Screen recording, Browser extension, 18 AI providers",
	};
	return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

/* ── WebSite ── */
export function WebSiteLD({ url = "https://lazynext.com" }: { url?: string }) {
	const schema = {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": `${url}/#website`,
		url,
		name: "Lazynext",
		description: "AI-powered video editing platform. Edit videos by describing what you want in natural language.",
		potentialAction: {
			"@type": "SearchAction",
			target: { "@type": "EntryPoint", urlTemplate: `${url}/search?q={search_term_string}` },
			"query-input": "required name=search_term_string",
		},
	};
	return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

/* ── VideoObject (for demo/tutorial videos) ── */
export function VideoObjectLD({ url = "https://lazynext.com" }: { url?: string }) {
	const schema = {
		"@context": "https://schema.org",
		"@type": "VideoObject",
		"@id": `${url}/#demo`,
		name: "Lazynext AI Video Editor — Demo",
		description: "See how Lazynext AI edits videos using natural language prompts.",
		thumbnailUrl: `${url}/og-image.png`,
		uploadDate: "2026-06-07",
		contentUrl: `${url}/demo.mp4`,
		embedUrl: `${url}/embed/demo`,
		duration: "PT2M30S",
		publisher: { "@type": "Organization", name: "Lazynext", url },
	};
	return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

/* ── BreadcrumbList ── */
export function BreadcrumbLD({ items, url = "https://lazynext.com" }: { items: Array<{ name: string; path: string }>; url?: string }) {
	const schema = {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: item.name,
			item: `${url}${item.path}`,
		})),
	};
	return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

/* ── HowTo (for tutorials) ── */
export function HowToLD({ steps }: { steps: Array<{ name: string; text: string }> }) {
	const schema = {
		"@context": "https://schema.org",
		"@type": "HowTo",
		name: "How to Edit Videos with Lazynext AI",
		description: "Follow these steps to edit your video using AI",
		step: steps.map((s, i) => ({
			"@type": "HowToStep",
			position: i + 1,
			name: s.name,
			text: s.text,
		})),
	};
	return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

/* ── Product ── */
export function ProductLD({ url = "https://lazynext.com" }: { url?: string }) {
	const schema = {
		"@context": "https://schema.org",
		"@type": "Product",
		"@id": `${url}/#product`,
		name: "Lazynext Pro",
		description: "Professional AI video editing subscription. Unlimited projects, 4K export, 18 AI models, priority support.",
		offers: {
			"@type": "Offer",
			price: "19",
			priceCurrency: "USD",
			priceValidUntil: "2027-12-31",
			itemCondition: "https://schema.org/NewCondition",
			availability: "https://schema.org/InStock",
		},
	};
	return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
