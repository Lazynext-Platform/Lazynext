"use server";

import { auth } from "@/auth/server";
import { headers } from "next/headers";

const RUST_API_GATEWAY_URL = process.env.RUST_API_GATEWAY_URL || "http://127.0.0.1:8005";

export async function createProject(userId: string, name: string): Promise<any> {
	// Proxied to Rust
	return { projectId: "new_project_id" };
}

export async function saveProject(projectId: string, projectData: any): Promise<any> {
	// Proxied to Rust
	return { success: true };
}

export async function getProject(projectId: string): Promise<any> {
	// Proxied to Rust
	return {
		id: projectId,
		title: "Untitled Project",
		crdtState: "{}",
		createdAt: new Date(),
		updatedAt: new Date(),
		timeline: {
			width: 1920,
			height: 1080,
			framerate: 30.0,
			tracks: [],
		}
	};
}

export async function getAllProjects(): Promise<any[]> {
	// Proxied to Rust
	return [];
}
