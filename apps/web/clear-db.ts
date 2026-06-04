import postgres from 'postgres';
const sql = postgres('postgres://lazynext:lazynext@127.0.0.1:5439/lazynext');
sql`DROP SCHEMA public CASCADE;`.then(() => sql`CREATE SCHEMA public;`).then(() => { console.log("Cleared schema"); process.exit(0); }).catch(console.error);
