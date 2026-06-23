"use server";

import { auth } from "@/auth/server";
import { headers } from "next/headers";

const RUST_API_GATEWAY_URL = process.env.RUST_API_GATEWAY_URL || "http://127.0.0.1:8005";

export async function createProject(title: string) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session || !session.user) throw new Error("Unauthorized");

	const res = await fetch(`${RUST_API_GATEWAY_URL}/api/v1/projects`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ title, userId: session.user.id }),
	});

	if (!res.ok) {
		throw new Error("Failed to create project");
	}

	return await res.json();
}
