import { searchEngine } from "@/lib/engine/search";
import { geminiChat } from "@/lib/gemini";
import type { Memory } from "@/lib/memories";

export type AskResult = {
  answer: string;
  citations: Memory[];
  mode: "hybrid" | "semantic" | "keyword";
};

export async function askMemories(
  question: string,
  containerTag = "default"
): Promise<AskResult> {
  const q = question.trim();
  if (!q) {
    return {
      answer: "Ask a question about your current facts.",
      citations: [],
      mode: "keyword",
    };
  }

  const { results, mode } = await searchEngine(q, containerTag, 5);
  const citations: Memory[] = results.map((hit) => ({
    id: hit.id,
    content: hit.content,
    containerTag: hit.containerTag,
    createdAt: "",
    score: hit.score,
    isLatest: hit.isLatest,
    documentId: hit.documentId,
    source: hit.kind === "memory" ? "graph" : "notebook",
  }));

  if (citations.length === 0) {
    return {
      answer: `I couldn't find current facts in "${containerTag}". Drop another thought, or ask about something you've already stored.`,
      citations: [],
      mode,
    };
  }

  const context = citations
    .map(
      (m, i) =>
        `[${i + 1}] (${m.isLatest === false ? "superseded" : "current"}${typeof m.score === "number" ? `, score ${(m.score * 100).toFixed(0)}%` : ""})\n${m.content}`
    )
    .join("\n\n");

  const answer = await geminiChat({
    temperature: 0.2,
    system: `You answer questions using only the user's current facts below.
Prefer facts marked current. If a fact is superseded, do not treat it as true now.
If the facts do not contain enough information, say so clearly.
Cite facts by number like [1] when you use them.
Be concise.`,
    user: `Current facts in space "${containerTag}":\n\n${context}\n\nQuestion: ${q}`,
  });

  if (!answer) {
    return {
      answer:
        "Could not reach Gemini. Set GEMINI_API_KEY, or wait if the free quota reset is pending.",
      citations,
      mode,
    };
  }

  return { answer, citations, mode };
}
