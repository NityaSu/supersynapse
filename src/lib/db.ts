import { Database } from "bun:sqlite";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "supersynapse.db");

const globalForDb = globalThis as unknown as { __ssDb?: Database };

export function getDb(): Database {
  if (!globalForDb.__ssDb) {
    const db = new Database(DB_PATH, { create: true });
    db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        container_tag TEXT NOT NULL DEFAULT 'default',
        created_at TEXT NOT NULL,
        embedding TEXT
      );
    `);
    globalForDb.__ssDb = db;
  }
  return globalForDb.__ssDb;
}
