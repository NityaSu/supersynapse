import { requireUser } from "@/lib/auth";
import { embed } from "@/lib/embeddings";
import { ensureSpace, normalizeSpaceName } from "@/lib/spaces";
import { escapeIlike, toVectorLiteral } from "@/lib/vector";

export type Memory = {
  id: string;
  content: string;
  containerTag: string;
  createdAt: string;
  score?: number;
};

export type SearchResult = {
  results: Memory[];
  mode: "hybrid" | "semantic" | "keyword";
};

type MemoryRow = {
  id: string;
  content: string;
  container_tag: string;
  created_at: string;
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
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("memories")
    .select("id, content, container_tag, created_at")
    .eq("container_tag", containerTag)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => rowToMemory(row));
}

export async function addMemory(
  content: string,
  containerTag = "default"
): Promise<Memory> {
  const { supabase, user } = await requireUser();
  const tag =
    normalizeSpaceName(containerTag) ||
    normalizeSpaceName("default") ||
    "default";
  await ensureSpace(tag);

  const memory = {
    id: crypto.randomUUID(),
    content: content.trim(),
    containerTag: tag,
    createdAt: new Date().toISOString(),
  };

  const vector = await embed(memory.content);
  const { error } = await supabase.from("memories").insert({
    id: memory.id,
    user_id: user.id,
    content: memory.content,
    container_tag: memory.containerTag,
    created_at: memory.createdAt,
    embedding: vector ? toVectorLiteral(vector) : null,
  });
  if (error) throw error;
  return memory;
}

export async function getMemory(id: string): Promise<Memory | null> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("memories")
    .select("id, content, container_tag, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToMemory(data) : null;
}

export async function updateMemory(
  id: string,
  updates: { content?: string; containerTag?: string }
): Promise<Memory | null> {
  const { supabase } = await requireUser();
  const existing = await getMemory(id);
  if (!existing) return null;

  const content =
    typeof updates.content === "string"
      ? updates.content.trim()
      : existing.content;
  const containerTag =
    typeof updates.containerTag === "string"
      ? normalizeSpaceName(updates.containerTag) || existing.containerTag
      : existing.containerTag;

  if (!content) return null;

  await ensureSpace(containerTag);

  const patch: Record<string, unknown> = {
    content,
    container_tag: containerTag,
  };

  if (content !== existing.content) {
    const vector = await embed(content);
    patch.embedding = vector ? toVectorLiteral(vector) : null;
  }

  const { error } = await supabase.from("memories").update(patch).eq("id", id);
  if (error) throw error;

  return {
    id,
    content,
    containerTag,
    createdAt: existing.createdAt,
  };
}

export async function deleteMemory(id: string): Promise<boolean> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("memories")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async function keywordSearch(
  query: string,
  containerTag: string
): Promise<Memory[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("memories")
    .select("id, content, container_tag, created_at")
    .eq("container_tag", containerTag)
    .ilike("content", `%${escapeIlike(q)}%`)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const text = row.content.toLowerCase();
    const score = text === q ? 1 : text.includes(q) ? 0.9 : 0.75;
    return rowToMemory(row, score);
  });
}

function mergeByBestScore(a: Memory[], b: Memory[]): Memory[] {
  const byId = new Map<string, Memory>();

  for (const memory of [...a, ...b]) {
    const prev = byId.get(memory.id);
    if (!prev || (memory.score ?? 0) > (prev.score ?? 0)) {
      byId.set(memory.id, memory);
    }
  }

  return [...byId.values()].sort((x, y) => (y.score ?? 0) - (x.score ?? 0));
}

export async function backfillMissingEmbeddings(
  containerTag = "default"
): Promise<number> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("memories")
    .select("id, content, embedding")
    .eq("container_tag", containerTag)
    .is("embedding", null);

  if (error) throw error;

  let updated = 0;
  for (const row of data ?? []) {
    const vector = await embed(row.content);
    if (!vector) continue;
    const { error: updateError } = await supabase
      .from("memories")
      .update({ embedding: toVectorLiteral(vector) })
      .eq("id", row.id);
    if (!updateError) updated += 1;
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

  const { supabase } = await requireUser();
  const keywordHits = await keywordSearch(q, containerTag);
  const queryVector = await embed(q);

  if (!queryVector) {
    return {
      results: keywordHits.slice(0, limit),
      mode: "keyword",
    };
  }

  await backfillMissingEmbeddings(containerTag);

  const { data, error } = await supabase.rpc("match_memories", {
    query_embedding: queryVector,
    match_container_tag: containerTag,
    match_count: limit,
  });

  const semanticHits: Memory[] = error
    ? []
    : ((data ?? []) as Array<MemoryRow & { score: number }>)
        .filter((row) => (row.score ?? 0) >= 0.25)
        .map((row) => rowToMemory(row, row.score));

  if (error) {
    console.error("match_memories failed:", error.message);
  }

  const merged = mergeByBestScore(keywordHits, semanticHits)
    .filter((m) => (m.score ?? 0) >= 0.25)
    .slice(0, limit);

  if (merged.length === 0) {
    return { results: [], mode: "hybrid" };
  }

  const keywordIds = new Set(keywordHits.map((m) => m.id));
  const semanticIds = new Set(semanticHits.map((m) => m.id));
  const usedKeyword = merged.some((m) => keywordIds.has(m.id));
  const usedSemantic = merged.some((m) => semanticIds.has(m.id));

  const mode =
    usedKeyword && usedSemantic
      ? "hybrid"
      : usedSemantic
        ? "semantic"
        : "keyword";

  return { results: merged, mode };
}
