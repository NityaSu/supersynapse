import { embed } from "@/lib/embeddings";
import { ollamaBaseUrl, ollamaChatModel } from "@/lib/ollama";
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

const UPDATE_THRESHOLD = 0.82;
const EXTEND_THRESHOLD = 0.55;

function fallbackFacts(content: string): string[] {
  return content
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12)
    .slice(0, 8);
}

function parseFactsJson(raw: string): string[] {
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
  try {
    const res = await fetch(`${ollamaBaseUrl()}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaChatModel(),
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: `Extract atomic personal/world facts from the document.
Return ONLY a JSON array of short strings.
Each fact should be one clear statement (e.g. "User loves Paris").
No markdown, no commentary.`,
          },
          {
            role: "user",
            content: content.slice(0, 6000),
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("dream extract failed:", res.status, await res.text());
      return fallbackFacts(content);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    const facts = parseFactsJson(text);
    return facts.length > 0 ? facts : fallbackFacts(content);
  } catch (err) {
    console.error("dream extract failed:", err);
    return fallbackFacts(content);
  }
}

/**
 * Instant dreaming: extract facts from a document, link them into the graph.
 * - high similarity → updates (supersede old, isLatest=0)
 * - medium → extends
 * - else → new root fact (optional derives edge skipped until richer model)
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
    let relation: "updates" | "extends" | null = null;
    let related: GraphMemory | null = null;

    if (vector) {
      const closest = findClosestLatestMemory(
        document.containerTag,
        vector,
        exclude
      );
      if (closest && closest.score >= UPDATE_THRESHOLD) {
        relation = "updates";
        related = closest.memory;
      } else if (closest && closest.score >= EXTEND_THRESHOLD) {
        relation = "extends";
        related = closest.memory;
      }
    }

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
        markMemoryNotLatest(related.id);
      }
      // Edge: new memory → related memory
      edges.push(
        insertEdge({
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

export function getDocumentDreamView(documentId: string): {
  memories: GraphMemory[];
  edges: MemoryEdge[];
} {
  const memories = listGraphMemoriesForDocument(documentId);
  const edges = listEdgesForMemories(memories.map((m) => m.id));
  return { memories, edges };
}
