import { createProject, getProject } from "./src/actions/project";

async function test() {
  try {
    console.log("Creating project...");
    const { projectId } = await createProject("test-user", "Test Project");
    console.log("Project created with ID:", projectId);

    console.log("Fetching project...");
    const project = await getProject(projectId);
    console.log("Fetched project successfully!");
    console.log("Project name:", project?.name);
    console.log("Project timeline exists:", !!project?.timeline);
    
    process.exit(0);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

test();
