import { getDb } from "@/lib/db";
import { cosineSimilarity, embed } from "@/lib/embeddings";
import type { GraphMemory, MemoryEdge, MemoryRelation } from "@/lib/engine/types";

type MemoryRow = {
  id: string;
  container_tag: string;
  document_id: string | null;
  content: string;
  is_latest: number;
  embedding: string | null;
  created_at: string;
  updated_at: string;
};

type EdgeRow = {
  id: string;
  container_tag: string;
  from_memory_id: string;
  to_memory_id: string;
  relation: string;
  created_at: string;
};

function rowToMemory(row: MemoryRow): GraphMemory {
  return {
    id: row.id,
    containerTag: row.container_tag,
    documentId: row.document_id,
    content: row.content,
    isLatest: row.is_latest === 1,
    embedding: row.embedding ? (JSON.parse(row.embedding) as number[]) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToEdge(row: EdgeRow): MemoryEdge {
  return {
    id: row.id,
    containerTag: row.container_tag,
    fromMemoryId: row.from_memory_id,
    toMemoryId: row.to_memory_id,
    relation: row.relation as MemoryRelation,
    createdAt: row.created_at,
  };
}

export function listLatestGraphMemories(
  containerTag: string,
  limit = 200
): GraphMemory[] {
  const db = getDb();
  const rows = db
    .query(
      `SELECT id, container_tag, document_id, content, is_latest, embedding,
              created_at, updated_at
       FROM graph_memories
       WHERE container_tag = ? AND is_latest = 1
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(containerTag, limit) as MemoryRow[];
  return rows.map(rowToMemory);
}

export function listGraphMemoriesForDocument(
  documentId: string
): GraphMemory[] {
  const db = getDb();
  const rows = db
    .query(
      `SELECT id, container_tag, document_id, content, is_latest, embedding,
              created_at, updated_at
       FROM graph_memories
       WHERE document_id = ?
       ORDER BY created_at ASC`
    )
    .all(documentId) as MemoryRow[];
  return rows.map(rowToMemory);
}

export function listEdgesForMemories(memoryIds: string[]): MemoryEdge[] {
  if (memoryIds.length === 0) return [];
  const db = getDb();
  const placeholders = memoryIds.map(() => "?").join(", ");
  const rows = db
    .query(
      `SELECT id, container_tag, from_memory_id, to_memory_id, relation, created_at
       FROM memory_edges
       WHERE from_memory_id IN (${placeholders})
          OR to_memory_id IN (${placeholders})`
    )
    .all(...memoryIds, ...memoryIds) as EdgeRow[];
  return rows.map(rowToEdge);
}

export async function insertGraphMemory(input: {
  containerTag: string;
  documentId: string | null;
  content: string;
  isLatest?: boolean;
}): Promise<GraphMemory> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const vector = await embed(input.content);

  db.run(
    `INSERT INTO graph_memories
      (id, container_tag, document_id, content, is_latest, embedding, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.containerTag,
      input.documentId,
      input.content.trim(),
      input.isLatest === false ? 0 : 1,
      vector ? JSON.stringify(vector) : null,
      now,
      now,
    ]
  );

  return {
    id,
    containerTag: input.containerTag,
    documentId: input.documentId,
    content: input.content.trim(),
    isLatest: input.isLatest !== false,
    embedding: vector,
    createdAt: now,
    updatedAt: now,
  };
}

export function markMemoryNotLatest(id: string) {
  const db = getDb();
  db.run(
    `UPDATE graph_memories SET is_latest = 0, updated_at = ? WHERE id = ?`,
    [new Date().toISOString(), id]
  );
}

export function insertEdge(input: {
  containerTag: string;
  fromMemoryId: string;
  toMemoryId: string;
  relation: MemoryRelation;
}): MemoryEdge {
  const db = getDb();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.run(
    `INSERT INTO memory_edges
      (id, container_tag, from_memory_id, to_memory_id, relation, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.containerTag,
      input.fromMemoryId,
      input.toMemoryId,
      input.relation,
      createdAt,
    ]
  );
  return {
    id,
    containerTag: input.containerTag,
    fromMemoryId: input.fromMemoryId,
    toMemoryId: input.toMemoryId,
    relation: input.relation,
    createdAt,
  };
}

/** Find the closest latest memory in the same container (by embedding cosine). */
export function findClosestLatestMemory(
  containerTag: string,
  vector: number[],
  excludeIds: Set<string> = new Set()
): { memory: GraphMemory; score: number } | null {
  const candidates = listLatestGraphMemories(containerTag);
  let best: { memory: GraphMemory; score: number } | null = null;

  for (const memory of candidates) {
    if (excludeIds.has(memory.id) || !memory.embedding) continue;
    if (memory.embedding.length !== vector.length) continue;
    const score = cosineSimilarity(vector, memory.embedding);
    if (!best || score > best.score) best = { memory, score };
  }
  return best;
}
