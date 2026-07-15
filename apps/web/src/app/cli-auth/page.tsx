/**
 * CLI Auth callback page — receives the redirect from social OAuth
 * sign-in and passes the session token back to the CLI via a
 * copyable code or localStorage bridge.
 *
 * @page /cli-auth
 */

import { headers } from "next/headers";
import { auth } from "@/auth/server";
import { CliAuthClient } from "./client";

export default async function CliAuthPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const token = session?.session?.token || "";
	const user = session?.user;

	return <CliAuthClient token={token} user={user} />;
}
