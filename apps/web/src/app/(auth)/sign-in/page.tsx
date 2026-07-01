/**
 * Sign-in page — renders the AuthCard with SignInForm.
 * Redirects authenticated users to the dashboard.
 *
 * @page /sign-in
 */

import { AuthCard } from "@/components/auth/AuthCard";
import { SignInForm } from "@/components/auth/SignInForm";
import { generateMetadata } from "@/seo/metadata";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth/server";

export const metadata = generateMetadata({
	title: "Sign In",
	description:
		"Sign in to Lazynext to access your AI-powered video editing projects. 18 AI models, Rust compositor, 6 platform formats.",
	path: "/sign-in",
});

export default async function SignInPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (session?.user) {
		redirect("/dashboard");
	}

	return (
		<AuthCard
			title="Welcome back"
			subtitle="Sign in to continue creating with Lazynext AI"
		>
			<SignInForm />
		</AuthCard>
	);
}
