const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://lazynext:password123@localhost:5432/lazynext_db" });
const start = Date.now();
pool.query('SELECT 1')
  .then(() => console.log('Connected in ' + (Date.now() - start) + 'ms'))
  .catch(e => console.error(e))
  .finally(() => pool.end());
