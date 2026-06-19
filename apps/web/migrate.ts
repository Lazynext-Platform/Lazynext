import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";

const connectionString = process.env.DATABASE_URL || "postgresql://lazynext:password123@127.0.0.1:5434/lazynext_db";
const isProd = process.env.NODE_ENV === "production";
const isUnixSocket = connectionString.includes("%2Fcloudsql");
const pool = new Pool({
  connectionString,
  ssl: isProd && !isUnixSocket ? { rejectUnauthorized: false } : undefined,
});
const db = drizzle(pool);

async function main() {
  const migrationsFolder = path.join(__dirname, "drizzle");
  console.log(`Migrating using folder: ${migrationsFolder}...`);
  await migrate(db, { migrationsFolder });
  console.log("Done!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
