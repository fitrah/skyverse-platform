import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL belum diatur. Isi environment terminal terlebih dahulu.");
  process.exit(1);
}
const client = new pg.Client({ connectionString: databaseUrl, ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: false } : false });
try {
  await client.connect();
  const migrationDir = resolve("database/migrations");
  const files = (await readdir(migrationDir)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = await readFile(resolve(migrationDir, file), "utf8");
    await client.query(sql);
    console.log(`Dijalankan: ${file}`);
  }
  console.log("Migrasi PostgreSQL selesai.");
} finally { await client.end(); }
