/**
 * Projects list page — displays all projects for the authenticated user.
 *
 * @page /projects
 * @module projects/page
 */

import { getAllProjects } from "@/actions/project";
import ProjectsClient from "./client";

/** Utility representing dynamic. */
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
	const allProjects = await getAllProjects();

	return <ProjectsClient initialProjects={allProjects} />;
}
