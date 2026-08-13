import { Database } from "bun:sqlite";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "supersynapse.db");
const DEFAULT_SPACES = ["default", "work", "personal"] as const;

const globalForDb = globalThis as unknown as { __ssDb?: Database };

export function getDb(): Database {
  if (!globalForDb.__ssDb) {
    globalForDb.__ssDb = new Database(DB_PATH, { create: true });
  }

  const db = globalForDb.__ssDb;
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      container_tag TEXT NOT NULL DEFAULT 'default',
      created_at TEXT NOT NULL,
      embedding TEXT
    );

    CREATE TABLE IF NOT EXISTS spaces (
      name TEXT PRIMARY KEY,
      created_at TEXT NOT NULL
    );
  `);

  const insertSpace = db.prepare(
    `INSERT OR IGNORE INTO spaces (name, created_at) VALUES (?, ?)`
  );
  const now = new Date().toISOString();
  for (const name of DEFAULT_SPACES) {
    insertSpace.run(name, now);
  }

  const existingTags = db
    .query(
      `SELECT DISTINCT container_tag AS name FROM memories WHERE container_tag != ''`
    )
    .all() as Array<{ name: string }>;
  for (const row of existingTags) {
    insertSpace.run(row.name, now);
  }

  return db;
}
