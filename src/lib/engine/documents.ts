import { requireUser } from "@/lib/auth";
import { embed } from "@/lib/embeddings";
import { ensureSpace, normalizeSpaceName } from "@/lib/spaces";
import { dreamDocument } from "@/lib/engine/dream";
import type {
  DocumentStatus,
  EngineChunk,
  EngineDocument,
} from "@/lib/engine/types";
import { parseEmbedding, toVectorLiteral } from "@/lib/vector";

type DocumentRow = {
  id: string;
  container_tag: string;
  title: string | null;
  content: string;
  type: string;
  status: string;
  error: string | null;
  chunk_count: number;
  metadata: Record<string, string | number | boolean> | string | null;
  created_at: string;
  updated_at: string;
};

type ChunkRow = {
  id: string;
  document_id: string;
  container_tag: string;
  content: string;
  position: number;
  embedding: unknown;
  created_at: string;
};

function parseMetadata(
  value: DocumentRow["metadata"]
): EngineDocument["metadata"] {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value) as EngineDocument["metadata"];
  } catch {
    return null;
  }
}

function rowToDocument(row: DocumentRow): EngineDocument {
  return {
    id: row.id,
    containerTag: row.container_tag,
    title: row.title,
    content: row.content,
    type: "text",
    status: row.status as DocumentStatus,
    error: row.error,
    chunkCount: row.chunk_count,
    metadata: parseMetadata(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToChunk(row: ChunkRow): EngineChunk {
  return {
    id: row.id,
    documentId: row.document_id,
    containerTag: row.container_tag,
    content: row.content,
    position: row.position,
    embedding: parseEmbedding(row.embedding),
    createdAt: row.created_at,
  };
}

async function setStatus(
  id: string,
  status: DocumentStatus,
  extra: { error?: string | null; chunkCount?: number } = {}
) {
  const { supabase } = await requireUser();
  const patch: Record<string, unknown> = {
    status,
    error: extra.error ?? null,
    updated_at: new Date().toISOString(),
  };
  if (extra.chunkCount !== undefined) patch.chunk_count = extra.chunkCount;
  const { error } = await supabase.from("documents").update(patch).eq("id", id);
  if (error) throw error;
}

/** Split raw text into rough chunks (Phase 1 — invent internals). */
export function chunkText(content: string): string[] {
  const parts = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return [content.trim()].filter(Boolean);

  const chunks: string[] = [];
  for (const part of parts) {
    if (part.length <= 800) {
      chunks.push(part);
      continue;
    }
    for (let i = 0; i < part.length; i += 700) {
      chunks.push(part.slice(i, i + 800).trim());
    }
  }
  return chunks.filter(Boolean);
}

export async function getDocument(id: string): Promise<EngineDocument | null> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, container_tag, title, content, type, status, error, chunk_count, metadata, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToDocument(data as DocumentRow) : null;
}

export async function listDocumentChunks(
  documentId: string
): Promise<EngineChunk[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("chunks")
    .select(
      "id, document_id, container_tag, content, position, embedding, created_at"
    )
    .eq("document_id", documentId)
    .order("position", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => rowToChunk(row as ChunkRow));
}

/**
 * Create a document, run ingest, then instant dreaming (graph facts + edges).
 */
export async function createDocument(input: {
  content: string;
  containerTag?: string;
  title?: string;
  metadata?: Record<string, string | number | boolean>;
}): Promise<EngineDocument> {
  const content = input.content.trim();
  if (!content) throw new Error("content is required");

  const { supabase, user } = await requireUser();
  const containerTag =
    normalizeSpaceName(input.containerTag ?? "default") || "default";
  await ensureSpace(containerTag);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error: insertError } = await supabase.from("documents").insert({
    id,
    user_id: user.id,
    container_tag: containerTag,
    title: input.title?.trim() || null,
    content,
    type: "text",
    status: "queued",
    error: null,
    chunk_count: 0,
    metadata: input.metadata ?? null,
    created_at: now,
    updated_at: now,
  });
  if (insertError) throw insertError;

  try {
    await setStatus(id, "extracting");
    await setStatus(id, "chunking");
    const pieces = chunkText(content);
    const createdAt = new Date().toISOString();
    if (pieces.length > 0) {
      const { error: chunkError } = await supabase.from("chunks").insert(
        pieces.map((piece, i) => ({
          id: crypto.randomUUID(),
          user_id: user.id,
          document_id: id,
          container_tag: containerTag,
          content: piece,
          position: i,
          embedding: null,
          created_at: createdAt,
        }))
      );
      if (chunkError) throw chunkError;
    }
    await setStatus(id, "embedding", { chunkCount: pieces.length });

    const { data: chunkRows, error: listError } = await supabase
      .from("chunks")
      .select("id, content")
      .eq("document_id", id)
      .order("position", { ascending: true });
    if (listError) throw listError;

    for (const row of chunkRows ?? []) {
      const vector = await embed(row.content);
      const { error: embedError } = await supabase
        .from("chunks")
        .update({
          embedding: vector ? toVectorLiteral(vector) : null,
        })
        .eq("id", row.id);
      if (embedError) throw embedError;
    }

    await setStatus(id, "indexing");

    const partial = await getDocument(id);
    if (partial) {
      await dreamDocument(partial);
    }

    await setStatus(id, "done", { chunkCount: pieces.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ingest failed";
    await setStatus(id, "failed", { error: message });
  }

  const doc = await getDocument(id);
  if (!doc) throw new Error("document missing after create");
  return doc;
}
