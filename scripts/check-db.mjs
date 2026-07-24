import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL belum diatur di .env.local.");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
try {
  await client.connect();
  const database = await client.query("SELECT current_database() AS name, version() AS version");
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log(`Terhubung ke database: ${database.rows[0].name}`);
  console.log(`PostgreSQL: ${database.rows[0].version.split(',')[0]}`);
  console.log(`Tabel: ${tables.rows.map((row) => row.table_name).join(', ') || 'belum ada'}`);
} finally {
  await client.end();
}
