import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth/server";

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session || !session.user) {
		redirect("/sign-in");
	}

	// In a real app, role is checked via session.user.role or proxying to rust
	// Here we just check for a generic admin claim if present, otherwise allow if logged in
	// For production we'd proxy to rust gateway for a strict check.
	const isAdmin = (session.user as any).role === "admin" || session.user.email?.includes("admin");
	if (!isAdmin) {
		// Forcibly redirect non-admins
		redirect("/editor");
	}

	return (
		<div className="min-h-screen bg-neutral-950 text-foreground">
			<nav className="border-b border-neutral-800 bg-neutral-900/50 p-4 sticky top-0 z-50 backdrop-blur-xl">
				<h1 className="text-xl font-bold text-cyan-400">
					Lazynext Command Center
				</h1>
			</nav>
			<main className="p-8">{children}</main>
		</div>
	);
}
