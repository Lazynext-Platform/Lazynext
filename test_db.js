import { db } from "./apps/web/src/db/index.js";
import { projects } from "./apps/web/src/db/schema.js";
import crypto from "crypto";

async function run() {
  try {
    const projectId = `prj_${crypto.randomUUID().replace(/-/g, "")}`;
    await db.insert(projects).values({
      id: projectId,
      name: "Test",
      userId: "test", // This might fail foreign key
      data: {}
    });
    console.log("Success");
  } catch (e) {
    console.error(e);
  }
}
run();
