import { requireUser } from "@/lib/auth";
import { embed } from "@/lib/embeddings";
import type { GraphMemory, MemoryEdge, MemoryRelation } from "@/lib/engine/types";
import { parseEmbedding, toVectorLiteral } from "@/lib/vector";

type MemoryRow = {
  id: string;
  container_tag: string;
  document_id: string | null;
  content: string;
  is_latest: boolean;
  embedding: unknown;
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
    isLatest: Boolean(row.is_latest),
    embedding: parseEmbedding(row.embedding),
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

export async function listLatestGraphMemories(
  containerTag: string,
  limit = 200
): Promise<GraphMemory[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("graph_memories")
    .select(
      "id, container_tag, document_id, content, is_latest, embedding, created_at, updated_at"
    )
    .eq("container_tag", containerTag)
    .eq("is_latest", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row) => rowToMemory(row as MemoryRow));
}

export async function listGraphMemoriesForDocument(
  documentId: string
): Promise<GraphMemory[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("graph_memories")
    .select(
      "id, container_tag, document_id, content, is_latest, embedding, created_at, updated_at"
    )
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => rowToMemory(row as MemoryRow));
}

export async function listEdgesForMemories(
  memoryIds: string[]
): Promise<MemoryEdge[]> {
  if (memoryIds.length === 0) return [];
  const { supabase } = await requireUser();

  const [{ data: fromRows, error: fromError }, { data: toRows, error: toError }] =
    await Promise.all([
      supabase
        .from("memory_edges")
        .select(
          "id, container_tag, from_memory_id, to_memory_id, relation, created_at"
        )
        .in("from_memory_id", memoryIds),
      supabase
        .from("memory_edges")
        .select(
          "id, container_tag, from_memory_id, to_memory_id, relation, created_at"
        )
        .in("to_memory_id", memoryIds),
    ]);

  if (fromError) throw fromError;
  if (toError) throw toError;

  const byId = new Map<string, MemoryEdge>();
  for (const row of [...(fromRows ?? []), ...(toRows ?? [])]) {
    byId.set(row.id, rowToEdge(row as EdgeRow));
  }
  return [...byId.values()];
}

export async function insertGraphMemory(input: {
  containerTag: string;
  documentId: string | null;
  content: string;
  isLatest?: boolean;
}): Promise<GraphMemory> {
  const { supabase, user } = await requireUser();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const vector = await embed(input.content);
  const isLatest = input.isLatest !== false;

  const { error } = await supabase.from("graph_memories").insert({
    id,
    user_id: user.id,
    container_tag: input.containerTag,
    document_id: input.documentId,
    content: input.content.trim(),
    is_latest: isLatest,
    embedding: vector ? toVectorLiteral(vector) : null,
    created_at: now,
    updated_at: now,
  });
  if (error) throw error;

  return {
    id,
    containerTag: input.containerTag,
    documentId: input.documentId,
    content: input.content.trim(),
    isLatest,
    embedding: vector,
    createdAt: now,
    updatedAt: now,
  };
}

export async function markMemoryNotLatest(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("graph_memories")
    .update({ is_latest: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function insertEdge(input: {
  containerTag: string;
  fromMemoryId: string;
  toMemoryId: string;
  relation: MemoryRelation;
}): Promise<MemoryEdge> {
  const { supabase, user } = await requireUser();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const { error } = await supabase.from("memory_edges").insert({
    id,
    user_id: user.id,
    container_tag: input.containerTag,
    from_memory_id: input.fromMemoryId,
    to_memory_id: input.toMemoryId,
    relation: input.relation,
    created_at: createdAt,
  });
  if (error) throw error;
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
export async function findClosestLatestMemory(
  containerTag: string,
  vector: number[],
  excludeIds: Set<string> = new Set()
): Promise<{ memory: GraphMemory; score: number } | null> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("match_graph_memories", {
    query_embedding: vector,
    match_container_tag: containerTag,
    match_count: 20,
  });

  if (error) {
    console.error("match_graph_memories failed:", error.message);
    return null;
  }

  type Hit = {
    id: string;
    document_id: string | null;
    content: string;
    container_tag: string;
    is_latest: boolean;
    created_at: string;
    updated_at: string;
    score: number;
  };

  const hit = ((data ?? []) as Hit[]).find((row) => !excludeIds.has(row.id));
  if (!hit) return null;

  return {
    memory: {
      id: hit.id,
      containerTag: hit.container_tag,
      documentId: hit.document_id,
      content: hit.content,
      isLatest: Boolean(hit.is_latest),
      embedding: null,
      createdAt: hit.created_at,
      updatedAt: hit.updated_at,
    },
    score: hit.score,
  };
}
