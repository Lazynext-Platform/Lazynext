import { db } from "./src/db/index.js";
import { sql } from "drizzle-orm";

async function run() {
  let start = Date.now();
  try {
    await db.execute(sql`SELECT * FROM does_not_exist`);
    console.log("Success");
  } catch (e: any) {
    console.log("Failed in " + (Date.now() - start) + "ms");
    console.log(e.message);
  }
  process.exit(0);
}
run();
