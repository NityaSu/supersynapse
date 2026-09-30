import { embed } from "@/lib/embeddings";
import { geminiChat } from "@/lib/gemini";
import {
  findClosestLatestMemory,
  insertEdge,
  insertGraphMemory,
  listGraphMemoriesForDocument,
  listEdgesForMemories,
  markMemoryNotLatest,
} from "@/lib/engine/graph";
import type { EngineDocument, GraphMemory, MemoryEdge } from "@/lib/engine/types";

export type DreamResult = {
  memories: GraphMemory[];
  edges: MemoryEdge[];
  extracted: number;
};

/**
 * Cosine similarity at or above this means the new fact supersedes the old one.
 * Provisional — see docs once the eval harness can measure false supersessions.
 */
export const UPDATE_THRESHOLD = 0.82;

/** At or above this (but below UPDATE_THRESHOLD) the new fact elaborates the old one. */
export const EXTEND_THRESHOLD = 0.55;

export type FactRelation = "updates" | "extends" | null;

/**
 * Decide how a new fact relates to the closest existing latest fact.
 * `null` score means there was no candidate or no embedding to compare.
 */
export function classifyRelation(score: number | null): FactRelation {
  if (score === null) return null;
  if (score >= UPDATE_THRESHOLD) return "updates";
  if (score >= EXTEND_THRESHOLD) return "extends";
  return null;
}

export function fallbackFacts(content: string): string[] {
  return content
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12)
    .slice(0, 8);
}

export function parseFactsJson(raw: string): string[] {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced?.[1]?.trim() ?? trimmed;
  const start = jsonText.indexOf("[");
  const end = jsonText.lastIndexOf("]");
  if (start === -1 || end === -1) return [];

  try {
    const parsed = JSON.parse(jsonText.slice(start, end + 1)) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object" && "content" in item) {
          const content = (item as { content: unknown }).content;
          return typeof content === "string" ? content.trim() : "";
        }
        return "";
      })
      .filter((s) => s.length >= 8)
      .slice(0, 12);
  } catch {
    return [];
  }
}

async function extractFacts(content: string): Promise<string[]> {
  const text = await geminiChat({
    temperature: 0.1,
    system: `Extract atomic personal/world facts from the document.
Return ONLY a JSON array of short strings.
Each fact should be one clear statement (e.g. "User loves Paris").
No markdown, no commentary.`,
    user: content.slice(0, 6000),
  });

  if (!text) return fallbackFacts(content);
  const facts = parseFactsJson(text);
  return facts.length > 0 ? facts : fallbackFacts(content);
}

/**
 * Instant dreaming: extract facts from a document, link them into the graph.
 * - high similarity → updates (supersede old, isLatest=false)
 * - medium → extends
 * - else → new root fact
 */
export async function dreamDocument(
  document: EngineDocument
): Promise<DreamResult> {
  const facts = await extractFacts(document.content);
  const created: GraphMemory[] = [];
  const edges: MemoryEdge[] = [];
  const exclude = new Set<string>();

  for (const fact of facts) {
    const vector = await embed(fact);
    const closest = vector
      ? await findClosestLatestMemory(document.containerTag, vector, exclude)
      : null;
    const relation = classifyRelation(closest ? closest.score : null);
    const related = relation ? closest!.memory : null;

    const memory = await insertGraphMemory({
      containerTag: document.containerTag,
      documentId: document.id,
      content: fact,
      isLatest: true,
    });
    created.push(memory);
    exclude.add(memory.id);

    if (relation && related) {
      if (relation === "updates") {
        await markMemoryNotLatest(related.id);
      }
      edges.push(
        await insertEdge({
          containerTag: document.containerTag,
          fromMemoryId: memory.id,
          toMemoryId: related.id,
          relation,
        })
      );
    }
  }

  return { memories: created, edges, extracted: facts.length };
}

export async function getDocumentDreamView(documentId: string): Promise<{
  memories: GraphMemory[];
  edges: MemoryEdge[];
}> {
  const memories = await listGraphMemoriesForDocument(documentId);
  const edges = await listEdgesForMemories(memories.map((m) => m.id));
  return { memories, edges };
}
