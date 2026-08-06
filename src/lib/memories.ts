import { getDb } from "@/lib/db";

export type Memory = {
  id: string;
  content: string;
  containerTag: string;
  createdAt: string;
};

type MemoryRow = {
  id: string;
  content: string;
  container_tag: string;
  created_at: string;
  embedding: string | null;
};

function rowToMemory(row: MemoryRow): Memory {
  return {
    id: row.id,
    content: row.content,
    containerTag: row.container_tag,
    createdAt: row.created_at,
  };
}

export async function listMemories(containerTag = "default"): Promise<Memory[]> {
  const db = getDb();
  const rows = db
    .query(
      `SELECT id, content, container_tag, created_at, embedding
       FROM memories
       WHERE container_tag = ?
       ORDER BY created_at DESC`
    )
    .all(containerTag) as MemoryRow[];

  return rows.map(rowToMemory);
}

export async function addMemory(
  content: string,
  containerTag = "default"
): Promise<Memory> {
  const db = getDb();
  const memory = {
    id: crypto.randomUUID(),
    content: content.trim(),
    containerTag: containerTag.trim() || "default",
    createdAt: new Date().toISOString(),
  };

  db.run(
    `INSERT INTO memories (id, content, container_tag, created_at, embedding)
     VALUES (?, ?, ?, ?, NULL)`,
    [memory.id, memory.content, memory.containerTag, memory.createdAt]
  );

  return memory;
}

export async function searchMemories(
  query: string,
  containerTag = "default"
): Promise<Memory[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const db = getDb();
  const rows = db
    .query(
      `SELECT id, content, container_tag, created_at, embedding
       FROM memories
       WHERE container_tag = ?
         AND lower(content) LIKE ?
       ORDER BY created_at DESC`
    )
    .all(containerTag, `%${q}%`) as MemoryRow[];

  return rows.map(rowToMemory);
}
