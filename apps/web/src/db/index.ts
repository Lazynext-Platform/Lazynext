/** @module Database client initialization with Drizzle ORM and PostgreSQL connection */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

// In test/CI environments without DATABASE_URL, export a proxy that throws
// lazily instead of crashing on module import. This allows tests that
// don't actually use the database to import db-dependent modules safely.
const isTestEnv = process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test" || process.env.VITEST;

if (!databaseUrl && !isTestEnv) {
	throw new Error("DATABASE_URL environment variable is required");
}

const client = databaseUrl
	? postgres(databaseUrl, {
			max: 20,
			idle_timeout: 30,
			connect_timeout: 10,
			prepare: false,
		})
	: null;

export const db = client
	? drizzle(client, { schema })
	: new Proxy({} as ReturnType<typeof drizzle>, {
			get(_target, prop) {
				throw new Error(
					`Cannot access db.${String(prop)}: DATABASE_URL is not configured (test environment without database)`,
				);
			},
		});
