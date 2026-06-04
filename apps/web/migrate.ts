import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const client = postgres("postgres://lazynext:lazynext@127.0.0.1:5440/lazynext");
const db = drizzle(client);

async function main() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "projects" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "user_id" text NOT NULL,
        "created_at" timestamp NOT NULL,
        "updated_at" timestamp NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "timelines" (
        "id" text PRIMARY KEY NOT NULL,
        "project_id" text NOT NULL,
        "width" integer DEFAULT 1920 NOT NULL,
        "height" integer DEFAULT 1080 NOT NULL,
        "framerate" real DEFAULT 30.0 NOT NULL,
        "created_at" timestamp NOT NULL,
        "updated_at" timestamp NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "tracks" (
        "id" text PRIMARY KEY NOT NULL,
        "timeline_id" text NOT NULL,
        "name" text NOT NULL,
        "z_index" integer NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "clips" (
        "id" text PRIMARY KEY NOT NULL,
        "track_id" text NOT NULL,
        "type" text NOT NULL,
        "source_url" text,
        "start_time" real NOT NULL,
        "duration" real NOT NULL,
        "properties" jsonb
    );
  `);
  console.log("Migration complete!");
  process.exit(0);
}
main().catch(console.error);
