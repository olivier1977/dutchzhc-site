/**
 * Database connection — singleton Drizzle client.
 *
 * Uses `postgres` (postgres.js) as the underlying driver.
 * The DATABASE_URL env var must be set before importing this module.
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!_db) {
    const url = process.env["DATABASE_URL"];
    if (!url) throw new Error("DATABASE_URL environment variable is required");

    _sql = postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    _db = drizzle(_sql, { schema });
  }
  return _db;
}

/** Close the connection pool — call on graceful shutdown. */
export async function closeDb() {
  if (_sql) {
    await _sql.end();
    _sql = null;
    _db = null;
  }
}

export { schema };
