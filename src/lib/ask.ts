import { searchMemories, type Memory } from "@/lib/memories";
import { ollamaBaseUrl, ollamaChatModel } from "@/lib/ollama";

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

  try {
    const res = await fetch(`${ollamaBaseUrl()}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaChatModel(),
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `You answer questions using only the user's saved memories below.
If the memories do not contain enough information, say so clearly.
Cite memories by number like [1] when you use them.
Be concise.`,
          },
          {
            role: "user",
            content: `Memories in space "${containerTag}":\n\n${context}\n\nQuestion: ${q}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("ask failed:", res.status, await res.text());
      return {
        answer:
          "Ollama chat failed. Is it running (`ollama serve`) and is the model pulled?",
        citations: results,
        mode,
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const answer =
      data.choices?.[0]?.message?.content?.trim() ||
      "No answer was returned.";

    return { answer, citations: results, mode };
  } catch (err) {
    console.error("ask failed (is ollama running?):", err);
    return {
      answer:
        "Could not reach Ollama. Start it with `ollama serve`, then try again.",
      citations: results,
      mode,
    };
  }
}
