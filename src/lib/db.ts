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

    -- Engine Phase 1: documents / chunks / graph memories / edges
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      container_tag TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      status TEXT NOT NULL DEFAULT 'queued',
      error TEXT,
      chunk_count INTEGER NOT NULL DEFAULT 0,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      container_tag TEXT NOT NULL,
      content TEXT NOT NULL,
      position INTEGER NOT NULL,
      embedding TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS graph_memories (
      id TEXT PRIMARY KEY,
      container_tag TEXT NOT NULL,
      document_id TEXT,
      content TEXT NOT NULL,
      is_latest INTEGER NOT NULL DEFAULT 1,
      embedding TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS memory_edges (
      id TEXT PRIMARY KEY,
      container_tag TEXT NOT NULL,
      from_memory_id TEXT NOT NULL,
      to_memory_id TEXT NOT NULL,
      relation TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (from_memory_id) REFERENCES graph_memories(id) ON DELETE CASCADE,
      FOREIGN KEY (to_memory_id) REFERENCES graph_memories(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_documents_container ON documents(container_tag);
    CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);
    CREATE INDEX IF NOT EXISTS idx_graph_memories_container ON graph_memories(container_tag);
    CREATE INDEX IF NOT EXISTS idx_memory_edges_container ON memory_edges(container_tag);
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

  const docTags = db
    .query(
      `SELECT DISTINCT container_tag AS name FROM documents WHERE container_tag != ''`
    )
    .all() as Array<{ name: string }>;
  for (const row of docTags) {
    insertSpace.run(row.name, now);
  }

  return db;
}
