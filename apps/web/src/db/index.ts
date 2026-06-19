import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Setup connection pool
const isProd = process.env.NODE_ENV === "production";
const pool = new Pool({
	connectionString:
		process.env.DATABASE_URL ||
		"postgresql://lazynext:password123@localhost:5432/lazynext_db",
	ssl: isProd ? { rejectUnauthorized: false } : undefined,
});

// Initialize Drizzle ORM
export const db = drizzle(pool, { schema });

// Re-export tables needed by other modules
export { feedback } from "./schema";
