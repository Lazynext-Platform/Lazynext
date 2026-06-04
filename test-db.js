const postgres = require('postgres');
const sql = postgres('postgres://lazynext:lazynext@127.0.0.1:5436/lazynext');
sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`.then(res => { console.log(res); process.exit(0); });
