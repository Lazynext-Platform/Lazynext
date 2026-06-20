// Quick database inspection script
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL || "postgresql://lazynext:password123@localhost:5432/lazynext_db";
const isUnixSocket = connectionString.includes("%2Fcloudsql");
const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" && !isUnixSocket ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("DATABASE_URL:", connectionString.replace(/:[^:@]+@/, ':***@'));
    
    // List all tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name;
    `);
    console.log("\n=== TABLES ===");
    console.log(tables.rows.map(r => r.table_name).join(", "));
    
    // Check projects table columns
    const projCols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    console.log("\n=== PROJECTS TABLE COLUMNS ===");
    projCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable}, default: ${r.column_default})`));

    // Check tracks table columns
    const trackCols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'tracks' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    console.log("\n=== TRACKS TABLE COLUMNS ===");
    trackCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable}, default: ${r.column_default})`));
    
    // Check timelines table columns
    const tlCols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'timelines' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    console.log("\n=== TIMELINES TABLE COLUMNS ===");
    tlCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable}, default: ${r.column_default})`));
    
    // Check user table columns  
    const userCols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'user' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    console.log("\n=== USER TABLE COLUMNS ===");
    userCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable}, default: ${r.column_default})`));
    
    // Try a simple projects query
    const projCount = await client.query("SELECT count(*) FROM projects;");
    console.log("\n=== PROJECT COUNT ===");
    console.log("Count:", projCount.rows[0].count);
    
  } catch (err) {
    console.error("ERROR:", err.message);
    console.error("DETAIL:", err.detail);
    console.error("CODE:", err.code);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
