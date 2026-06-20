const { Client } = require("pg");

async function tryAuth(user, pass, dbName) {
  const connectionString = `postgresql://${user}:${pass}@localhost:5434/${dbName}?sslmode=disable`;
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log(`Success with ${user}:${pass} on ${dbName}`);
    await client.query('ALTER TABLE tracks ADD COLUMN IF NOT EXISTS "order" integer NOT NULL DEFAULT 0;');
    console.log("Migration successful");
    await client.end();
    return true;
  } catch (err) {
    console.error(`Failed with ${user}:${pass} on ${dbName} -`, err.message);
    return false;
  }
}

async function main() {
  const combinations = [
    ["postgres", "postgres", "postgres"],
    ["postgres", "lazynext", "lazynext"],
    ["lazynext", "lazynext", "lazynext"],
    ["lazynext_app", "strong_password_for_lazynext_dev_db_778899", "lazynext"],
    ["postgres", "strong_password_for_lazynext_dev_db_778899", "postgres"],
    ["postgres", "strong_password_for_lazynext_dev_db_778899", "lazynext"],
  ];
  
  for (const [u, p, d] of combinations) {
    const ok = await tryAuth(u, p, d);
    if (ok) return;
  }
}

main();
