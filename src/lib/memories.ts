import { getDb } from "@/lib/db";
import { cosineSimilarity, embed } from "@/lib/embeddings";

export type Memory = {
  id: string;
  content: string;
  containerTag: string;
  createdAt: string;
  score?: number;
};

export type SearchResult = {
  results: Memory[];
  mode: "semantic" | "keyword";
};

type MemoryRow = {
  id: string;
  content: string;
  container_tag: string;
  created_at: string;
  embedding: string | null;
};

function rowToMemory(row: MemoryRow, score?: number): Memory {
  return {
    id: row.id,
    content: row.content,
    containerTag: row.container_tag,
    createdAt: row.created_at,
    ...(score !== undefined ? { score } : {}),
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

  return rows.map((row) => rowToMemory(row));
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

  // Try to store a vector for later semantic search (null if no API key)
  const vector = await embed(memory.content);
  const embeddingJson = vector ? JSON.stringify(vector) : null;

  db.run(
    `INSERT INTO memories (id, content, container_tag, created_at, embedding)
     VALUES (?, ?, ?, ?, ?)`,
    [
      memory.id,
      memory.content,
      memory.containerTag,
      memory.createdAt,
      embeddingJson,
    ]
  );

  return memory;
}

async function keywordSearch(
  query: string,
  containerTag: string
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

  return rows.map((row) => rowToMemory(row));
}

/** Fill embeddings for older rows that were saved before the API key existed. */
export async function backfillMissingEmbeddings(
  containerTag = "default"
): Promise<number> {
  if (!process.env.OPENAI_API_KEY) return 0;

  const db = getDb();
  const rows = db
    .query(
      `SELECT id, content, container_tag, created_at, embedding
       FROM memories
       WHERE container_tag = ?
         AND (embedding IS NULL OR embedding = '')`
    )
    .all(containerTag) as MemoryRow[];

  let updated = 0;
  for (const row of rows) {
    const vector = await embed(row.content);
    if (!vector) continue;
    db.run(`UPDATE memories SET embedding = ? WHERE id = ?`, [
      JSON.stringify(vector),
      row.id,
    ]);
    updated += 1;
  }
  return updated;
}

export async function searchMemories(
  query: string,
  containerTag = "default",
  limit = 10
): Promise<SearchResult> {
  const q = query.trim();
  if (!q) return { results: [], mode: "keyword" };

  const queryVector = await embed(q);

  // No API key / embed failed → Day 1 style keyword search
  if (!queryVector) {
    return {
      results: await keywordSearch(q, containerTag),
      mode: "keyword",
    };
  }

  await backfillMissingEmbeddings(containerTag);

  const db = getDb();
  const rows = db
    .query(
      `SELECT id, content, container_tag, created_at, embedding
       FROM memories
       WHERE container_tag = ?`
    )
    .all(containerTag) as MemoryRow[];

  const scored = rows
    .map((row) => {
      if (!row.embedding) return null;
      try {
        const memoryVector = JSON.parse(row.embedding) as number[];
        const score = cosineSimilarity(queryVector, memoryVector);
        return rowToMemory(row, score);
      } catch {
        return null;
      }
    })
    .filter((m): m is Memory => m !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .filter((m) => (m.score ?? 0) >= 0.25)
    .slice(0, limit);

  // If nothing scored well (e.g. old rows without embeddings), fall back
  if (scored.length === 0) {
    return {
      results: await keywordSearch(q, containerTag),
      mode: "keyword",
    };
  }

  return { results: scored, mode: "semantic" };
}
