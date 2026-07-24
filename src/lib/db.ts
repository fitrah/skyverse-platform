import "server-only";
import { Pool, type QueryResultRow } from "pg";

const globalForDb = globalThis as unknown as { skyversePool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL belum diatur. Salin .env.example menjadi .env.local.");
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: false } : false,
  });
}

export function getPool() {
  globalForDb.skyversePool ??= createPool();
  return globalForDb.skyversePool;
}

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  return getPool().query<T>(text, values);
}
