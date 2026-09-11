import { requireUser } from "@/lib/auth";
import { embed } from "@/lib/embeddings";
import { normalizeSpaceName } from "@/lib/spaces";
import { escapeIlike } from "@/lib/vector";

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

async function keywordHits(
  containerTag: string,
  q: string
): Promise<EngineSearchHit[]> {
  const { supabase } = await requireUser();
  const like = `%${escapeIlike(q)}%`;

  const [{ data: chunks, error: chunkError }, { data: memories, error: memError }] =
    await Promise.all([
      supabase
        .from("chunks")
        .select("id, document_id, container_tag, content")
        .eq("container_tag", containerTag)
        .ilike("content", like),
      supabase
        .from("graph_memories")
        .select("id, document_id, container_tag, content, is_latest")
        .eq("container_tag", containerTag)
        .eq("is_latest", true)
        .ilike("content", like),
    ]);

  if (chunkError) throw chunkError;
  if (memError) throw memError;

  return [
    ...(chunks ?? []).map((row) => ({
      id: row.id,
      kind: "chunk" as const,
      content: row.content,
      containerTag: row.container_tag,
      documentId: row.document_id,
      score: keywordScore(row.content, q),
    })),
    ...(memories ?? []).map((row) => ({
      id: row.id,
      kind: "memory" as const,
      content: row.content,
      containerTag: row.container_tag,
      documentId: row.document_id,
      score: keywordScore(row.content, q),
      isLatest: Boolean(row.is_latest),
    })),
  ].filter((h) => h.score > 0);
}

async function semanticHits(
  containerTag: string,
  queryVector: number[]
): Promise<EngineSearchHit[]> {
  const { supabase } = await requireUser();
  const [{ data: chunks, error: chunkError }, { data: memories, error: memError }] =
    await Promise.all([
      supabase.rpc("match_chunks", {
        query_embedding: queryVector,
        match_container_tag: containerTag,
        match_count: 20,
      }),
      supabase.rpc("match_graph_memories", {
        query_embedding: queryVector,
        match_container_tag: containerTag,
        match_count: 20,
      }),
    ]);

  if (chunkError) console.error("match_chunks failed:", chunkError.message);
  if (memError) console.error("match_graph_memories failed:", memError.message);

  type ChunkHit = {
    id: string;
    document_id: string;
    content: string;
    container_tag: string;
    score: number;
  };
  type MemoryHit = {
    id: string;
    document_id: string | null;
    content: string;
    container_tag: string;
    is_latest: boolean;
    score: number;
  };

  return [
    ...((chunks ?? []) as ChunkHit[])
      .filter((row) => row.score >= 0.25)
      .map((row) => ({
        id: row.id,
        kind: "chunk" as const,
        content: row.content,
        containerTag: row.container_tag,
        documentId: row.document_id,
        score: row.score,
      })),
    ...((memories ?? []) as MemoryHit[])
      .filter((row) => row.score >= 0.25)
      .map((row) => ({
        id: row.id,
        kind: "memory" as const,
        content: row.content,
        containerTag: row.container_tag,
        documentId: row.document_id,
        score: row.score,
        isLatest: Boolean(row.is_latest),
      })),
  ];
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
  const containerTag = normalizeSpaceName(containerTagInput) || "default";

  if (!q) {
    return { results: [], mode: "keyword", containerTag };
  }

  const kw = await keywordHits(containerTag, q);
  const queryVector = await embed(query.trim());

  if (!queryVector) {
    return {
      results: mergeHits(kw).slice(0, limit),
      mode: "keyword",
      containerTag,
    };
  }

  const sem = await semanticHits(containerTag, queryVector);
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
