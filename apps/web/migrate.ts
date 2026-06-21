import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "./src/db/schema.js";
import path from "path";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  console.log("Connecting to database at:", connectionString?.replace(/:[^:@]+@/, ':***@'));
  
  const isUnixSocket = connectionString?.includes("%2Fcloudsql");
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" && !isUnixSocket ? { rejectUnauthorized: false } : undefined,
  });

  const db = drizzle(pool, { schema });

  try {
    console.log("Running migrations...");
    // Provide path to the migrations folder
    // In production, this runs from the /app directory and the folder is in /app/apps/web/drizzle
    const migrationsFolder = process.env.NODE_ENV === "production" ? path.join(process.cwd(), "apps/web/drizzle") : path.join(process.cwd(), "drizzle");
    await migrate(db, { migrationsFolder });
    console.log("Migrations complete!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
