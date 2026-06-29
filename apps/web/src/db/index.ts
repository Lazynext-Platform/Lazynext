import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

// PostgreSQL client with connection pooling via postgres.js
const queryClient = postgres(databaseUrl, {
  max: 20, // Max connections in pool
  idle_timeout: 30, // Close idle connections after 30s
  connect_timeout: 10, // Connection timeout in seconds
  prepare: false, // Disable prepared statements (better for serverless)
});

export const db = drizzle(queryClient, { schema });
