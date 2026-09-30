import { describe, expect, test } from "bun:test";
import { chunkText } from "@/lib/engine/documents";

const MAX_CHUNK = 800;

describe("chunkText", () => {
  test("splits on blank lines", () => {
    expect(chunkText("First para.\n\nSecond para.")).toEqual([
      "First para.",
      "Second para.",
    ]);
  });

  test("collapses runs of more than two newlines", () => {
    expect(chunkText("First.\n\n\n\nSecond.")).toEqual(["First.", "Second."]);
  });

  test("keeps single newlines inside one chunk", () => {
    expect(chunkText("Line one\nline two")).toEqual(["Line one\nline two"]);
  });

  test("trims each chunk", () => {
    expect(chunkText("  padded  \n\n  also padded  ")).toEqual([
      "padded",
      "also padded",
    ]);
  });

  test("drops empty paragraphs", () => {
    expect(chunkText("First.\n\n   \n\nSecond.")).toEqual(["First.", "Second."]);
  });

  test("returns a single chunk for short content with no blank lines", () => {
    expect(chunkText("Just one thought.")).toEqual(["Just one thought."]);
  });

  test("returns no chunks for empty or whitespace-only content", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n  \n ")).toEqual([]);
  });

  test("splits a paragraph longer than the chunk limit", () => {
    const long = "a".repeat(2000);
    const chunks = chunkText(long);
    expect(chunks.length).toBeGreaterThan(1);
  });

  test("never emits a chunk over the limit", () => {
    const long = `${"a".repeat(1900)}\n\n${"b".repeat(900)}`;
    for (const chunk of chunkText(long)) {
      expect(chunk.length).toBeLessThanOrEqual(MAX_CHUNK);
    }
  });

  test("overlaps long chunks so a fact split across the boundary survives", () => {
    const long = "a".repeat(1600);
    const chunks = chunkText(long);
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    expect(total).toBeGreaterThan(long.length);
  });

  test("preserves all content of a split paragraph", () => {
    const long = "x".repeat(1500);
    expect(chunkText(long).join("")).toContain("x".repeat(700));
  });

  test("keeps a paragraph exactly at the limit intact", () => {
    const exact = "a".repeat(MAX_CHUNK);
    expect(chunkText(exact)).toEqual([exact]);
  });

  test("handles a mix of short and long paragraphs", () => {
    const content = `Short one.\n\n${"y".repeat(1200)}\n\nShort two.`;
    const chunks = chunkText(content);
    expect(chunks[0]).toBe("Short one.");
    expect(chunks.at(-1)).toBe("Short two.");
    expect(chunks.length).toBeGreaterThan(3);
  });
});
