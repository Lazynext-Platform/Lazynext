import { ThemeProvider } from "next-themes";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "../components/ui/sonner";
import { ChangelogNotification } from "@/changelog/components/changelog-notification";
import { TooltipProvider } from "../components/ui/tooltip";
import { BotIdClient } from "botid/client";
import { webEnv } from "@/env/web";
import { Inter } from "next/font/google";
import { OrganizationSchema, SoftwareAppSchema } from "@/seo/StructuredData";
import { generateMetadata } from "@/seo/metadata";
import { CookieConsent } from "@/components/analytics/CookieConsent";
import { WebVitals } from "@/components/analytics/WebVitals";

const siteFont = Inter({ subsets: ["latin"] });

export const metadata = generateMetadata({});

const protectedRoutes = [{ path: "/none", method: "GET" }];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<BotIdClient protect={protectedRoutes} />
				<OrganizationSchema />
				<SoftwareAppSchema />
				<link rel="icon" type="image/x-icon" href="/favicon.ico" />
				<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
				<meta name="theme-color" content="#7c3aed" />
				<meta name="color-scheme" content="dark" />
				{process.env.NODE_ENV === "development" && (
					<Script src="//unpkg.com/react-scan/dist/auto.global.js" crossOrigin="anonymous" strategy="beforeInteractive" />
				)}
			</head>
			<body className={`${siteFont.className} font-sans antialiased`}>
				<ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange={true}>
					<TooltipProvider>
						<Toaster />
						<Script src="https://cdn.databuddy.cc/databuddy.js" strategy="afterInteractive" async
							data-client-id="UP-Wcoy5arxFeK7oyjMMZ"
							data-disabled={webEnv.NODE_ENV === "development"}
							data-track-attributes={false} data-track-errors={true}
							data-track-outgoing-links={false} data-track-web-vitals={false}
							data-track-sessions={false} />
						{children}
						<CookieConsent />
						<WebVitals />
					</TooltipProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
