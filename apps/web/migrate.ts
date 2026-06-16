import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const pool = new Pool({ connectionString: "postgresql://lazynext:password123@127.0.0.1:5434/lazynext_db" });
const db = drizzle(pool);

async function main() {
  console.log("Migrating...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Done!");
  process.exit(0);
}

main().catch(console.error);
