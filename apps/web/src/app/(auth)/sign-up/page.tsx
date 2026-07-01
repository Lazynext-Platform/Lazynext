/**
 * Sign-up page — renders the AuthCard with SignUpForm.
 * Redirects authenticated users to the dashboard.
 *
 * @page /sign-up
 */

import { AuthCard } from "@/components/auth/AuthCard";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { generateMetadata } from "@/seo/metadata";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth/server";

export const metadata = generateMetadata({
	title: "Sign Up — Start Free",
	description:
		"Create your free Lazynext account and start editing videos with AI. No credit card required. 18 AI providers, 4K export, Rust-powered.",
	path: "/sign-up",
});

export default async function SignUpPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (session?.user) {
		redirect("/dashboard");
	}

	return (
		<AuthCard
			title="Create your account"
			subtitle="Start editing videos with AI-powered tools"
		>
			<SignUpForm />
		</AuthCard>
	);
}
