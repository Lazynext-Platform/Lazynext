import { AuthCard } from "@/components/auth/AuthCard";
import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
	return (
		<AuthCard
			title="Welcome back"
			subtitle="Sign in to continue creating with Lazynext AI"
		>
			<SignInForm />
		</AuthCard>
	);
}
