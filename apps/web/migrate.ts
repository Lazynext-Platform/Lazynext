import { Pool } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  console.log("Probing database schema...");
  
  const isUnixSocket = connectionString?.includes("%2Fcloudsql");
  const pool = new Pool({
    connectionString,
    ssl: !isUnixSocket ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'projects';
    `);
    console.log("PROJECTS TABLE COLUMNS:", res.rows);
    
    // Also try doing the exact query
    try {
      await pool.query('select "id", "user_id", "name", "fps", "width", "height", "duration_frames", "data", "created_at", "updated_at" from "projects" limit 1');
      console.log("QUERY SUCCESS!");
    } catch(err: any) {
      console.error("QUERY ERROR:", err.message);
    }

  } catch (err) {
    console.error("PROBE ERROR:", err);
  }
  
  process.exit(0);
}

main();
