import { getAllProjects } from "@/actions/project";
import ProjectsClient from "./client";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const allProjects = await getAllProjects();
  
  return <ProjectsClient initialProjects={allProjects} />;
}
