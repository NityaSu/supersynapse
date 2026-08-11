import { ollamaBaseUrl, ollamaEmbedModel } from "@/lib/ollama";

/**
 * Embeddings turn text into a list of numbers (a vector).
 * Similar meanings → similar vectors → high cosine similarity.
 * That is how "I love Paris" can match "favorite travel city".
 *
 * Uses local Ollama — free, no OpenAI key.
 */

export async function embed(text: string): Promise<number[] | null> {
  const input = text.trim();
  if (!input) return null;

  try {
    const res = await fetch(`${ollamaBaseUrl()}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaEmbedModel(),
        input,
      }),
    });

    if (!res.ok) {
      console.error("embed failed:", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as {
      embeddings?: number[][];
      embedding?: number[];
    };

    // /api/embed returns embeddings[][]; older /api/embeddings used embedding
    if (data.embeddings?.[0]) return data.embeddings[0];
    if (data.embedding) return data.embedding;
    return null;
  } catch (err) {
    console.error("embed failed (is ollama running?):", err);
    return null;
  }
}

/** Cosine similarity: 1 = identical direction, 0 = unrelated, -1 = opposite */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
