import { AuthCard } from "@/components/auth/AuthCard";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { generateMetadata } from "@/seo/metadata";

export const metadata = generateMetadata({
	title: "Sign Up — Start Free",
	description:
		"Create your free Lazynext account and start editing videos with AI. No credit card required. 18 AI providers, 4K export, Rust-powered.",
	path: "/sign-up",
});

export default function SignUpPage() {
	return (
		<AuthCard
			title="Create your account"
			subtitle="Start editing videos with AI-powered tools"
		>
			<SignUpForm />
		</AuthCard>
	);
}
