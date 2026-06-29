const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}
const pool = new Pool({ connectionString });
const start = Date.now();
pool.query('SELECT 1')
  .then(() => console.log('Connected in ' + (Date.now() - start) + 'ms'))
  .catch(e => console.error(e))
  .finally(() => pool.end());
