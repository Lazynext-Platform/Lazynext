const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  const c = await p.connect();
  try {
    const cols = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='tracks' AND table_schema='public' ORDER BY ordinal_position");
    console.log('TRACKS_COLS:', JSON.stringify(cols.rows));
    const pcols = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='projects' AND table_schema='public' ORDER BY ordinal_position");
    console.log('PROJECTS_COLS:', JSON.stringify(pcols.rows));
    const cnt = await c.query('SELECT count(*) FROM projects');
    console.log('PROJECT_COUNT:', cnt.rows[0].count);
  } catch (e) {
    console.error('ERR:', e.message, e.code);
  } finally {
    c.release();
    await p.end();
  }
})();
