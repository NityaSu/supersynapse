import { getDb } from "@/lib/db";
import { cosineSimilarity, embed } from "@/lib/embeddings";
import { normalizeSpaceName } from "@/lib/spaces";

export type SearchHitKind = "chunk" | "memory";

export type EngineSearchHit = {
  id: string;
  kind: SearchHitKind;
  content: string;
  containerTag: string;
  documentId: string | null;
  score: number;
  isLatest?: boolean;
};

export type EngineSearchResult = {
  results: EngineSearchHit[];
  mode: "hybrid" | "semantic" | "keyword";
  containerTag: string;
};

type ChunkRow = {
  id: string;
  document_id: string;
  container_tag: string;
  content: string;
  embedding: string | null;
};

type MemoryRow = {
  id: string;
  document_id: string | null;
  container_tag: string;
  content: string;
  is_latest: number;
  embedding: string | null;
};

function keywordScore(content: string, q: string): number {
  const text = content.toLowerCase();
  if (text === q) return 1;
  if (text.includes(q)) return 0.9;
  return 0;
}

function mergeHits(hits: EngineSearchHit[]): EngineSearchHit[] {
  const byKey = new Map<string, EngineSearchHit>();
  for (const hit of hits) {
    const key = `${hit.kind}:${hit.id}`;
    const prev = byKey.get(key);
    if (!prev || hit.score > prev.score) byKey.set(key, hit);
  }
  return [...byKey.values()].sort((a, b) => b.score - a.score);
}

function keywordHits(
  containerTag: string,
  q: string
): EngineSearchHit[] {
  const db = getDb();
  const like = `%${q}%`;

  const chunks = db
    .query(
      `SELECT id, document_id, container_tag, content, embedding
       FROM chunks
       WHERE container_tag = ? AND lower(content) LIKE ?`
    )
    .all(containerTag, like) as ChunkRow[];

  const memories = db
    .query(
      `SELECT id, document_id, container_tag, content, is_latest, embedding
       FROM graph_memories
       WHERE container_tag = ?
         AND is_latest = 1
         AND lower(content) LIKE ?`
    )
    .all(containerTag, like) as MemoryRow[];

  return [
    ...chunks.map((row) => ({
      id: row.id,
      kind: "chunk" as const,
      content: row.content,
      containerTag: row.container_tag,
      documentId: row.document_id,
      score: keywordScore(row.content, q),
    })),
    ...memories.map((row) => ({
      id: row.id,
      kind: "memory" as const,
      content: row.content,
      containerTag: row.container_tag,
      documentId: row.document_id,
      score: keywordScore(row.content, q),
      isLatest: row.is_latest === 1,
    })),
  ].filter((h) => h.score > 0);
}

function semanticHits(
  containerTag: string,
  queryVector: number[]
): EngineSearchHit[] {
  const db = getDb();

  const chunks = db
    .query(
      `SELECT id, document_id, container_tag, content, embedding
       FROM chunks WHERE container_tag = ?`
    )
    .all(containerTag) as ChunkRow[];

  const memories = db
    .query(
      `SELECT id, document_id, container_tag, content, is_latest, embedding
       FROM graph_memories
       WHERE container_tag = ? AND is_latest = 1`
    )
    .all(containerTag) as MemoryRow[];

  const fromChunks: EngineSearchHit[] = [];
  for (const row of chunks) {
    if (!row.embedding) continue;
    try {
      const vector = JSON.parse(row.embedding) as number[];
      if (vector.length !== queryVector.length) continue;
      const score = cosineSimilarity(queryVector, vector);
      if (score < 0.25) continue;
      fromChunks.push({
        id: row.id,
        kind: "chunk",
        content: row.content,
        containerTag: row.container_tag,
        documentId: row.document_id,
        score,
      });
    } catch {
      /* skip bad embedding */
    }
  }

  const fromMemories: EngineSearchHit[] = [];
  for (const row of memories) {
    if (!row.embedding) continue;
    try {
      const vector = JSON.parse(row.embedding) as number[];
      if (vector.length !== queryVector.length) continue;
      const score = cosineSimilarity(queryVector, vector);
      if (score < 0.25) continue;
      fromMemories.push({
        id: row.id,
        kind: "memory",
        content: row.content,
        containerTag: row.container_tag,
        documentId: row.document_id,
        score,
        isLatest: row.is_latest === 1,
      });
    } catch {
      /* skip */
    }
  }

  return [...fromChunks, ...fromMemories];
}

/**
 * Hybrid search over engine chunks + latest graph memories.
 * Scoped by containerTag.
 */
export async function searchEngine(
  query: string,
  containerTagInput = "default",
  limit = 10
): Promise<EngineSearchResult> {
  const q = query.trim().toLowerCase();
  const containerTag =
    normalizeSpaceName(containerTagInput) || "default";

  if (!q) {
    return { results: [], mode: "keyword", containerTag };
  }

  const kw = keywordHits(containerTag, q);
  const queryVector = await embed(query.trim());

  if (!queryVector) {
    return {
      results: mergeHits(kw).slice(0, limit),
      mode: "keyword",
      containerTag,
    };
  }

  const sem = semanticHits(containerTag, queryVector);
  const merged = mergeHits([...kw, ...sem])
    .filter((h) => h.score >= 0.25)
    .slice(0, limit);

  if (merged.length === 0) {
    return { results: [], mode: "hybrid", containerTag };
  }

  const kwKeys = new Set(kw.map((h) => `${h.kind}:${h.id}`));
  const semKeys = new Set(sem.map((h) => `${h.kind}:${h.id}`));
  const usedKw = merged.some((h) => kwKeys.has(`${h.kind}:${h.id}`));
  const usedSem = merged.some((h) => semKeys.has(`${h.kind}:${h.id}`));

  const mode =
    usedKw && usedSem ? "hybrid" : usedSem ? "semantic" : "keyword";

  return { results: merged, mode, containerTag };
}
