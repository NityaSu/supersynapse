import { GEMINI_EMBED_DIM } from "@/lib/gemini";

export function parseEmbedding(value: unknown): number[] | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const nums = value.filter((n): n is number => typeof n === "number");
    return nums.length === GEMINI_EMBED_DIM ? nums : null;
  }
  if (typeof value === "string") {
    try {
      return parseEmbedding(JSON.parse(value));
    } catch {
      return null;
    }
  }
  return null;
}

export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

export function escapeIlike(query: string): string {
  return query.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}
