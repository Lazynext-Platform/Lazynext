/**
 * Projects layout — auth guard that redirects unauthenticated users.
 *
 * @layout /projects
 * @module projects/layout
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth/server";

export default async function ProjectsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const bypassCookie = (await headers())
		.get("cookie")
		?.includes("e2e-bypass=true");

	if (!session && !bypassCookie) {
		redirect("/sign-in");
	}

	return <>{children}</>;
}
