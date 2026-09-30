import { requireUser } from "@/lib/auth";
import { embed } from "@/lib/embeddings";
import {
  SCORE_FLOOR,
  keywordScore,
  mergeByBestScore,
  resolveMode,
} from "@/lib/rank";
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

/** Stable identity for a hit — chunks and graph memories have separate id spaces. */
export function hitKey(hit: Pick<EngineSearchHit, "kind" | "id">): string {
  return `${hit.kind}:${hit.id}`;
}

function mergeHits(hits: EngineSearchHit[]): EngineSearchHit[] {
  return mergeByBestScore(hits, hitKey, (hit) => hit.score);
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
      .filter((row) => row.score >= SCORE_FLOOR)
      .map((row) => ({
        id: row.id,
        kind: "chunk" as const,
        content: row.content,
        containerTag: row.container_tag,
        documentId: row.document_id,
        score: row.score,
      })),
    ...((memories ?? []) as MemoryHit[])
      .filter((row) => row.score >= SCORE_FLOOR)
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
    .filter((h) => h.score >= SCORE_FLOOR)
    .slice(0, limit);

  if (merged.length === 0) {
    return { results: [], mode: "hybrid", containerTag };
  }

  const mode = resolveMode(
    merged.map(hitKey),
    new Set(kw.map(hitKey)),
    new Set(sem.map(hitKey))
  );

  return { results: merged, mode, containerTag };
}
