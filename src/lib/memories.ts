import { getDb } from "@/lib/db";
import { cosineSimilarity, embed } from "@/lib/embeddings";
import { ensureSpace, normalizeSpaceName } from "@/lib/spaces";

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
  const tag =
    normalizeSpaceName(containerTag) ||
    normalizeSpaceName("default") ||
    "default";
  ensureSpace(tag);

  const memory = {
    id: crypto.randomUUID(),
    content: content.trim(),
    containerTag: tag,
    createdAt: new Date().toISOString(),
  };

  // Store a vector for semantic search (null if Ollama is down)
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

export async function getMemory(id: string): Promise<Memory | null> {
  const db = getDb();
  const row = db
    .query(
      `SELECT id, content, container_tag, created_at, embedding
       FROM memories
       WHERE id = ?`
    )
    .get(id) as MemoryRow | null;

  return row ? rowToMemory(row) : null;
}

export async function updateMemory(
  id: string,
  updates: { content?: string; containerTag?: string }
): Promise<Memory | null> {
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

  ensureSpace(containerTag);

  const contentChanged = content !== existing.content;
  let embeddingJson: string | null = null;

  if (contentChanged) {
    const vector = await embed(content);
    embeddingJson = vector ? JSON.stringify(vector) : null;

    const db = getDb();
    db.run(
      `UPDATE memories
       SET content = ?, container_tag = ?, embedding = ?
       WHERE id = ?`,
      [content, containerTag, embeddingJson, id]
    );
  } else {
    const db = getDb();
    db.run(`UPDATE memories SET container_tag = ? WHERE id = ?`, [
      containerTag,
      id,
    ]);
  }

  return {
    id,
    content,
    containerTag,
    createdAt: existing.createdAt,
  };
}

export async function deleteMemory(id: string): Promise<boolean> {
  const db = getDb();
  const result = db.run(`DELETE FROM memories WHERE id = ?`, [id]);
  return result.changes > 0;
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

  // Keyword hits get a strong score so exact names/IDs aren't buried by vectors
  return rows.map((row) => {
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

/** Fill embeddings for rows missing vectors (or wrong dimension after model switch). */
export async function backfillMissingEmbeddings(
  containerTag = "default",
  expectedDim?: number
): Promise<number> {
  const db = getDb();
  const rows = db
    .query(
      `SELECT id, content, container_tag, created_at, embedding
       FROM memories
       WHERE container_tag = ?`
    )
    .all(containerTag) as MemoryRow[];

  let updated = 0;
  for (const row of rows) {
    let needsEmbed = !row.embedding;
    if (!needsEmbed && expectedDim !== undefined && row.embedding) {
      try {
        const existing = JSON.parse(row.embedding) as number[];
        needsEmbed = existing.length !== expectedDim;
      } catch {
        needsEmbed = true;
      }
    } else if (!needsEmbed) {
      continue;
    }

    if (!needsEmbed) continue;

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

  const keywordHits = await keywordSearch(q, containerTag);
  const queryVector = await embed(q);

  // Ollama down / embed model missing → keyword only
  if (!queryVector) {
    return {
      results: keywordHits.slice(0, limit),
      mode: "keyword",
    };
  }

  await backfillMissingEmbeddings(containerTag, queryVector.length);

  const db = getDb();
  const rows = db
    .query(
      `SELECT id, content, container_tag, created_at, embedding
       FROM memories
       WHERE container_tag = ?`
    )
    .all(containerTag) as MemoryRow[];

  const semanticHits = rows
    .map((row) => {
      if (!row.embedding) return null;
      try {
        const memoryVector = JSON.parse(row.embedding) as number[];
        if (memoryVector.length !== queryVector.length) return null;
        const score = cosineSimilarity(queryVector, memoryVector);
        return rowToMemory(row, score);
      } catch {
        return null;
      }
    })
    .filter((m): m is Memory => m !== null)
    .filter((m) => (m.score ?? 0) >= 0.25);

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
