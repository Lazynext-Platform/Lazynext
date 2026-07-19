/**
 * Root layout — wraps all pages with theme provider, 8 analytics
 * providers, SEO metadata, cookie consent, and the global TooltipProvider.
 *
 * Analytics stack: PostHog, Clarity, Mixpanel,
 * Amplitude, Umami, Matomo, OpenPanel, Countly.
 *
 * @layout /
 */

import { ThemeProvider } from "next-themes";
import "../globals.css";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";

import { Inter } from "next/font/google";
import { OrganizationLD, SoftwareAppLD, WebSiteLD } from "@/seo/SchemaOrg";
import { generateMetadata } from "@/seo/metadata";
import { SEOHeadTags, PreloadHeroImage } from "@/seo/HeadMeta";
import { CookieConsent } from "@/components/analytics/CookieConsent";
import { WebVitals } from "@/components/analytics/WebVitals";

const siteFont = Inter({ subsets: ["latin"] });

/** Utility representing metadata. */
export const metadata = generateMetadata({});

// Analytics providers — each conditional on its env var
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { ClarityProvider } from "@/components/providers/clarity-provider";
import { MixpanelProvider } from "@/components/providers/mixpanel-provider";
import { AmplitudeProvider } from "@/components/providers/amplitude-provider";
import { UmamiProvider } from "@/components/providers/umami-provider";
import { MatomoProvider } from "@/components/providers/matomo-provider";
import { OpenPanelProvider } from "@/components/providers/openpanel-provider";
import { CountlyProvider } from "@/components/providers/countly-provider";

import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { LocaleHtml } from "@/components/locale-html";

/** App root layout with providers, scripts, and global page shell. */
export default async function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
    const locale = await getLocale();
    const messages = await getMessages();

	return (
		<LocaleHtml>
			<head>
				<OrganizationLD />
				<SoftwareAppLD />
				<WebSiteLD />
				<SEOHeadTags />
				<PreloadHeroImage />
				<link rel="icon" type="image/x-icon" href="/favicon.ico" />
				<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
				<link rel="manifest" href="/manifest.json" />
				<meta name="theme-color" content="#01f3fe" />
			</head>
			<body
				className={`${siteFont.className} font-sans antialiased min-h-screen selection:bg-cyan-500/30 selection:text-cyan-200`}
			>
                <NextIntlClientProvider messages={messages}>
				{/* Background Mesh */}
				<div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-background to-background" />
				<div className="fixed top-0 left-0 w-full h-full -z-20 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-10 dark:opacity-5 mix-blend-overlay" />

				<PostHogProvider>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem={true}
						disableTransitionOnChange={true}
					>
						<TooltipProvider>
							<Toaster />

							{/* SaaS Analytics — conditional on env vars */}
							<ClarityProvider />
							<MixpanelProvider />
							<AmplitudeProvider />

							{/* Self-hosted Analytics — conditional on env vars */}
							<UmamiProvider />
							<MatomoProvider />
							<OpenPanelProvider />
							<CountlyProvider />

							<div className="relative flex min-h-screen flex-col">
								{children}
							</div>

							<CookieConsent />
							<WebVitals />
						</TooltipProvider>
					</ThemeProvider>
				</PostHogProvider>
                </NextIntlClientProvider>
			</body>
		</LocaleHtml>
	);
}
