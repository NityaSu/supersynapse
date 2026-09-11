/**
 * Embeddings via Gemini (free tier). Falls back to null if the key is missing
 * or the API is rate-limited — callers then use keyword search.
 */

import { geminiEmbed } from "@/lib/gemini";

export async function embed(text: string): Promise<number[] | null> {
  const input = text.trim();
  if (!input) return null;

  try {
    return await geminiEmbed(input);
  } catch (err) {
    console.error("embed failed:", err);
    return null;
  }
}
