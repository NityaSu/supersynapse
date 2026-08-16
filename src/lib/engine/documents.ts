import { getDb } from "@/lib/db";
import { embed } from "@/lib/embeddings";
import { ensureSpace, normalizeSpaceName } from "@/lib/spaces";
import { dreamDocument } from "@/lib/engine/dream";
import type {
  DocumentStatus,
  EngineChunk,
  EngineDocument,
} from "@/lib/engine/types";

type DocumentRow = {
  id: string;
  container_tag: string;
  title: string | null;
  content: string;
  type: string;
  status: string;
  error: string | null;
  chunk_count: number;
  metadata: string | null;
  created_at: string;
  updated_at: string;
};

type ChunkRow = {
  id: string;
  document_id: string;
  container_tag: string;
  content: string;
  position: number;
  embedding: string | null;
  created_at: string;
};

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
    metadata: row.metadata
      ? (JSON.parse(row.metadata) as EngineDocument["metadata"])
      : null,
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
    embedding: row.embedding
      ? (JSON.parse(row.embedding) as number[])
      : null,
    createdAt: row.created_at,
  };
}

function setStatus(
  id: string,
  status: DocumentStatus,
  extra: { error?: string | null; chunkCount?: number } = {}
) {
  const db = getDb();
  const updatedAt = new Date().toISOString();
  if (extra.chunkCount !== undefined) {
    db.run(
      `UPDATE documents
       SET status = ?, error = ?, chunk_count = ?, updated_at = ?
       WHERE id = ?`,
      [status, extra.error ?? null, extra.chunkCount, updatedAt, id]
    );
  } else {
    db.run(
      `UPDATE documents SET status = ?, error = ?, updated_at = ? WHERE id = ?`,
      [status, extra.error ?? null, updatedAt, id]
    );
  }
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

export function getDocument(id: string): EngineDocument | null {
  const db = getDb();
  const row = db
    .query(
      `SELECT id, container_tag, title, content, type, status, error,
              chunk_count, metadata, created_at, updated_at
       FROM documents WHERE id = ?`
    )
    .get(id) as DocumentRow | null;
  return row ? rowToDocument(row) : null;
}

export function listDocumentChunks(documentId: string): EngineChunk[] {
  const db = getDb();
  const rows = db
    .query(
      `SELECT id, document_id, container_tag, content, position, embedding, created_at
       FROM chunks WHERE document_id = ? ORDER BY position ASC`
    )
    .all(documentId) as ChunkRow[];
  return rows.map(rowToChunk);
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

  const containerTag =
    normalizeSpaceName(input.containerTag ?? "default") || "default";
  ensureSpace(containerTag);

  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO documents
      (id, container_tag, title, content, type, status, error, chunk_count, metadata, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'text', 'queued', NULL, 0, ?, ?, ?)`,
    [
      id,
      containerTag,
      input.title?.trim() || null,
      content,
      input.metadata ? JSON.stringify(input.metadata) : null,
      now,
      now,
    ]
  );

  try {
    setStatus(id, "extracting");

    setStatus(id, "chunking");
    const pieces = chunkText(content);
    const createdAt = new Date().toISOString();
    for (let i = 0; i < pieces.length; i++) {
      db.run(
        `INSERT INTO chunks
          (id, document_id, container_tag, content, position, embedding, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?)`,
        [crypto.randomUUID(), id, containerTag, pieces[i], i, createdAt]
      );
    }
    setStatus(id, "embedding", { chunkCount: pieces.length });

    const chunkRows = db
      .query(
        `SELECT id, content FROM chunks WHERE document_id = ? ORDER BY position ASC`
      )
      .all(id) as Array<{ id: string; content: string }>;

    for (const row of chunkRows) {
      const vector = await embed(row.content);
      db.run(`UPDATE chunks SET embedding = ? WHERE id = ?`, [
        vector ? JSON.stringify(vector) : null,
        row.id,
      ]);
    }

    setStatus(id, "indexing");

    const partial = getDocument(id);
    if (partial) {
      await dreamDocument(partial);
    }

    setStatus(id, "done", { chunkCount: pieces.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ingest failed";
    setStatus(id, "failed", { error: message });
  }

  const doc = getDocument(id);
  if (!doc) throw new Error("document missing after create");
  return doc;
}
