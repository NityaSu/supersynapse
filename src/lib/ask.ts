import { searchMemories, type Memory } from "@/lib/memories";
import { geminiChat } from "@/lib/gemini";

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
      answer: "Ask a question about your memories.",
      citations: [],
      mode: "keyword",
    };
  }

  const { results, mode } = await searchMemories(q, containerTag, 5);

  if (results.length === 0) {
    return {
      answer: `I couldn't find relevant memories in "${containerTag}". Try saving more, or ask about something you've already stored.`,
      citations: [],
      mode,
    };
  }

  const context = results
    .map(
      (m, i) =>
        `[${i + 1}] (${m.createdAt}${typeof m.score === "number" ? `, score ${(m.score * 100).toFixed(0)}%` : ""})\n${m.content}`
    )
    .join("\n\n");

  const answer = await geminiChat({
    temperature: 0.2,
    system: `You answer questions using only the user's saved memories below.
If the memories do not contain enough information, say so clearly.
Cite memories by number like [1] when you use them.
Be concise.`,
    user: `Memories in space "${containerTag}":\n\n${context}\n\nQuestion: ${q}`,
  });

  if (!answer) {
    return {
      answer:
        "Could not reach Gemini. Set GEMINI_API_KEY, or wait if the free quota reset is pending.",
      citations: results,
      mode,
    };
  }

  return { answer, citations: results, mode };
}
