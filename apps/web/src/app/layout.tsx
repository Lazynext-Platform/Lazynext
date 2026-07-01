/**
 * Root layout — wraps all pages with theme provider, analytics,
 * SEO metadata, cookie consent, and the global TooltipProvider.
 *
 * @layout /
 */

import { ThemeProvider } from "next-themes";
import Script from "next/script";
import "../globals.css";
import { Toaster } from "../components/ui/sonner";
import { ChangelogNotification } from "@/changelog/components/changelog-notification";
import { TooltipProvider } from "../components/ui/tooltip";

import { Inter } from "next/font/google";
import { OrganizationLD, SoftwareAppLD, WebSiteLD } from "@/seo/SchemaOrg";
import { generateMetadata } from "@/seo/metadata";
import { SEOHeadTags, PreloadHeroImage } from "@/seo/HeadMeta";
import { CookieConsent } from "@/components/analytics/CookieConsent";
import { WebVitals } from "@/components/analytics/WebVitals";

const siteFont = Inter({ subsets: ["latin"] });

export const metadata = generateMetadata({});

import { PostHogProvider } from "@/components/providers/posthog-provider";

/** App root layout with providers, scripts, and global page shell. */
export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning>
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
				{/* Background Mesh */}
				<div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-background to-background" />
				<div className="fixed top-0 left-0 w-full h-full -z-20 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-10 dark:opacity-5 mix-blend-overlay" />

				<PostHogProvider>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						disableTransitionOnChange={true}
					>
						<TooltipProvider>
							<Toaster />
							<Script
								src="https://cdn.databuddy.cc/databuddy.js"
								strategy="afterInteractive"
								async
								data-client-id="UP-Wcoy5arxFeK7oyjMMZ"
								data-disabled={process.env.NODE_ENV === "development"}
								data-track-attributes={false}
								data-track-errors={true}
								data-track-outgoing-links={false}
								data-track-web-vitals={false}
								data-track-sessions={false}
							/>

							<div className="relative flex min-h-screen flex-col">
								{children}
							</div>

							<CookieConsent />
							<WebVitals />
						</TooltipProvider>
					</ThemeProvider>
				</PostHogProvider>
			</body>
		</html>
	);
}
