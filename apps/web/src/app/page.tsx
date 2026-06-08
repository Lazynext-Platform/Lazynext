// Revalidate every 60 seconds — prevents ISR caching stale error pages
export const revalidate = 60;

import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { CTASection } from "@/components/landing/CTASection";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { generateMetadata } from "@/seo/metadata";
import { FAQSchema } from "@/seo/StructuredData";

export const metadata = generateMetadata({
	title: "AI Video Editing Platform — Edit with Natural Language",
	description: "Lazynext is an AI-powered video editor. Describe your edit in words — cut silences, add color grade, boost audio — and our multi-model AI agent executes it. 18 AI providers, 6 platforms, Rust compositor.",
});

const FAQ_ITEMS = [
	{ q: "What is Lazynext?", a: "Lazynext is an AI-powered video editing platform that lets you edit videos by describing what you want in natural language. It uses multiple AI models (18 providers) and a Rust-based compositor for high-performance video processing." },
	{ q: "How does AI video editing work?", a: "Simply describe your edit — like 'cut the silences and add a cinematic color grade' — and the AI agent automatically performs the edit using deterministic Rust tooling. No manual timeline dragging needed." },
	{ q: "Is Lazynext free?", a: "Yes! Lazynext offers a free tier with 1 project, 720p export, and basic AI tools. Pro ($19/mo) and Studio ($49/mo) plans unlock unlimited projects, 4K/8K export, and advanced features." },
	{ q: "Which AI models does Lazynext support?", a: "Lazynext supports 18 AI providers including Anthropic Claude, OpenAI GPT-4o, Google Gemini, Mistral, DeepSeek, Groq, xAI Grok, Meta Llama, Cohere, and local models via Ollama." },
	{ q: "What platforms is Lazynext available on?", a: "Lazynext is available in 6 formats: Web App (browser), Desktop (macOS/Windows/Linux), CLI, MCP Server, Mobile C-API (iOS/Android), and Browser Extension." },
];

export default function Home() {
	return (
		<div className="bg-background">
			<Header />
			<HeroSection />
			<FeaturesGrid />
			<CTASection />
			<Footer />
			<FAQSchema questions={FAQ_ITEMS} />
		</div>
	);
}
