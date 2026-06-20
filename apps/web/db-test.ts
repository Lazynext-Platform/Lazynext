import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { projects, timelines, tracks } from "./src/db/schema";
import { eq } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL;
console.log("Connecting to", connectionString?.substring(0, 30) + "...");
const isUnixSocket = connectionString?.includes("%2Fcloudsql");
const pool = new Pool({
  connectionString,
  ssl: !isUnixSocket ? { rejectUnauthorized: false } : undefined,
});
const db = drizzle(pool);

async function main() {
  try {
    console.log("Testing GET /api/projects equivalent...");
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, "fake_user_id"))
      .limit(1);
    console.log("GET SUCCESS:", userProjects);

    console.log("Testing POST /api/projects equivalent...");
    const projectId = `prj_test_${Date.now()}`;
    await db.insert(projects).values({
      id: projectId,
      name: "Test Project",
      userId: "fake_user_id",
      data: {},
    });
    console.log("POST PROJECT SUCCESS");

    const timelineId = `tl_test_${Date.now()}`;
    await db.insert(timelines).values({
      id: timelineId,
      projectId,
      width: 1920,
      height: 1080,
      framerate: 30,
    });
    console.log("POST TIMELINE SUCCESS");

    await db.insert(tracks).values([
      {
        id: `trk_v_test_${Date.now()}`,
        projectId,
        timelineId,
        name: "Video 1",
        type: "video",
        zIndex: 1,
        order: 1,
      },
      {
        id: `trk_a_test_${Date.now()}`,
        projectId,
        timelineId,
        name: "Audio 1",
        type: "audio",
        zIndex: 0,
        order: 0,
      },
    ]);
    console.log("POST TRACKS SUCCESS");

  } catch (err) {
    console.error("DB TEST ERROR:", err);
  } finally {
    process.exit(0);
  }
}

main();
