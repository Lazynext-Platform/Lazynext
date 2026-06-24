import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "./src/db/schema.js";
import path from "path";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  console.log("Connecting to database at:", connectionString?.replace(/:[^:@]+@/, ':***@'));
  
  const isUnixSocket = connectionString?.includes("%2Fcloudsql");
  // Use SSL in production unless connecting via Unix socket (Cloud SQL proxy).
  // Never disable certificate validation — the proxy handles TLS for private-IP connections.
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" && !isUnixSocket ? { rejectUnauthorized: true } : undefined,
  });

  const db = drizzle(pool, { schema });

  try {
    console.log("Running migrations...");
    // Provide path to the migrations folder
    // In production (Docker), the working directory is the monorepo root,
    // so migrations live under apps/web/drizzle.
    // Set MIGRATIONS_DIR to override if needed.
    const migrationsFolder = process.env.MIGRATIONS_DIR
      || (process.env.NODE_ENV === "production" ? path.join(process.cwd(), "apps/web/drizzle") : path.join(process.cwd(), "drizzle"));
    await migrate(db, { migrationsFolder });
    console.log("Migrations complete!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
