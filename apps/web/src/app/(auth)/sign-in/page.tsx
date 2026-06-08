import { AuthCard } from "@/components/auth/AuthCard";
import { SignInForm } from "@/components/auth/SignInForm";
import { generateMetadata } from "@/seo/metadata";

export const metadata = generateMetadata({
  title: "Sign In",
  description: "Sign in to Lazynext to access your AI-powered video editing projects. 18 AI models, Rust compositor, 6 platform formats.",
  path: "/sign-in",
});

export default function SignInPage() {
  return <AuthCard title="Welcome back" subtitle="Sign in to continue creating with Lazynext AI"><SignInForm /></AuthCard>;
}
