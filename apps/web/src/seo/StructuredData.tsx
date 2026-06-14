// JSON-LD Structured Data for rich search results (Google, Bing)

import React from "react";

interface OrganizationSchemaProps {
	url?: string;
}

export function OrganizationSchema({
	url = "https://lazynext.com",
}: OrganizationSchemaProps) {
	const schema = {
		"@context": "https://schema.org",
		"@type": "Organization",
		"@id": `${url}/#organization`,
		name: "Lazynext",
		url,
		logo: `${url}/logo.png`,
		description:
			"AI-powered video editing platform with multi-model AI agents, Rust compositor, and 6 platform formats.",
		foundingDate: "2025",
		sameAs: [
			"https://github.com/Lazynext-Corporation",
			"https://discord.gg/lazynext",
		],
		contactPoint: {
			"@type": "ContactPoint",
			email: "support@lazynext.com",
			contactType: "customer support",
		},
	};

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
		/>
	);
}

interface SoftwareAppSchemaProps {
	url?: string;
}

export function SoftwareAppSchema({
	url = "https://lazynext.com",
}: SoftwareAppSchemaProps) {
	const schema = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		"@id": `${url}/#software`,
		name: "Lazynext",
		applicationCategory: "MultimediaApplication",
		operatingSystem: "Web, macOS, Windows, Linux, iOS, Android",
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "USD",
			description: "Free tier available",
		},
		aggregateRating: {
			"@type": "AggregateRating",
			ratingValue: "4.8",
			ratingCount: "128",
		},
	};

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
		/>
	);
}

interface BreadcrumbSchemaProps {
	items: Array<{ name: string; path: string }>;
	url?: string;
}

export function BreadcrumbSchema({
	items,
	url = "https://lazynext.com",
}: BreadcrumbSchemaProps) {
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

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
		/>
	);
}

interface FAQSchemaProps {
	questions: Array<{ q: string; a: string }>;
}

export function FAQSchema({ questions }: FAQSchemaProps) {
	const schema = {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: questions.map(({ q, a }) => ({
			"@type": "Question",
			name: q,
			acceptedAnswer: {
				"@type": "Answer",
				text: a,
			},
		})),
	};

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
		/>
	);
}

// Combined SEO head component
interface SEOHeadProps {
	title?: string;
	description?: string;
	path?: string;
	image?: string;
	type?: "website" | "article";
	breadcrumbs?: Array<{ name: string; path: string }>;
}

export function SEOHead({ breadcrumbs }: SEOHeadProps) {
	return (
		<>
			<OrganizationSchema />
			<SoftwareAppSchema />
			{breadcrumbs && <BreadcrumbSchema items={breadcrumbs} />}
		</>
	);
}
