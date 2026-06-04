import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { webEnv } from "@/env/web";

let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
	if (!_db) {
		const client = postgres(webEnv.DATABASE_URL, {
			...(process.env.NODE_ENV === "production" ? {
				host: "/cloudsql/vertexaiopencode:us-central1:lazynext-db"
			} : {})
		});
		_db = drizzle(client, { schema });
	}

	return _db;
}

export const db = getDb();

export * from "./schema";
