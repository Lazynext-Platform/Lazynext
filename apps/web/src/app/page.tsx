import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { CTASection } from "@/components/landing/CTASection";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";
import { SITE_URL } from "@/site/brand";

export const metadata: Metadata = {
	alternates: { canonical: SITE_URL },
};

export default function Home() {
	return (
		<div className="bg-zinc-950">
			<Header />
			<HeroSection />
			<FeaturesGrid />
			<CTASection />
			<Footer />
		</div>
	);
}
