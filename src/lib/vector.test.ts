import { describe, expect, test } from "bun:test";
import { GEMINI_EMBED_DIM } from "@/lib/gemini";
import { escapeIlike, parseEmbedding, toVectorLiteral } from "@/lib/vector";

const vectorOfLength = (length: number, fill = 0.5) =>
  Array.from({ length }, (_, i) => fill + i * 1e-6);

const validVector = vectorOfLength(GEMINI_EMBED_DIM);

describe("parseEmbedding", () => {
  test("accepts an array of exactly the model's dimensions", () => {
    expect(parseEmbedding(validVector)).toHaveLength(GEMINI_EMBED_DIM);
  });

  test("rejects a vector with too few dimensions", () => {
    expect(parseEmbedding(vectorOfLength(GEMINI_EMBED_DIM - 1))).toBeNull();
  });

  test("rejects a vector with too many dimensions", () => {
    expect(parseEmbedding(vectorOfLength(GEMINI_EMBED_DIM + 1))).toBeNull();
  });

  test("parses the JSON string form Postgres returns for a vector column", () => {
    expect(parseEmbedding(JSON.stringify(validVector))).toHaveLength(
      GEMINI_EMBED_DIM
    );
  });

  test("round-trips through toVectorLiteral", () => {
    expect(parseEmbedding(toVectorLiteral(validVector))).toEqual(validVector);
  });

  test("returns null for malformed JSON instead of throwing", () => {
    expect(parseEmbedding("[0.1, 0.2,")).toBeNull();
  });

  test("returns null for null, undefined and empty string", () => {
    expect(parseEmbedding(null)).toBeNull();
    expect(parseEmbedding(undefined)).toBeNull();
    expect(parseEmbedding("")).toBeNull();
  });

  test("rejects a vector padded with non-numbers rather than silently shrinking it", () => {
    const dirty = [...vectorOfLength(GEMINI_EMBED_DIM - 1), "nope"];
    expect(parseEmbedding(dirty)).toBeNull();
  });

  test("rejects objects and numbers", () => {
    expect(parseEmbedding({ values: validVector })).toBeNull();
    expect(parseEmbedding(42)).toBeNull();
  });
});

describe("toVectorLiteral", () => {
  test("formats as a pgvector literal", () => {
    expect(toVectorLiteral([1, 2.5, -3])).toBe("[1,2.5,-3]");
  });

  test("formats an empty vector without breaking the syntax", () => {
    expect(toVectorLiteral([])).toBe("[]");
  });
});

describe("escapeIlike", () => {
  test("escapes the single-character wildcard", () => {
    expect(escapeIlike("a_b")).toBe("a\\_b");
  });

  test("escapes the multi-character wildcard", () => {
    expect(escapeIlike("50%")).toBe("50\\%");
  });

  test("escapes the escape character itself", () => {
    expect(escapeIlike("a\\b")).toBe("a\\\\b");
  });

  test("leaves ordinary search text untouched", () => {
    expect(escapeIlike("deploy on friday")).toBe("deploy on friday");
  });

  test("neutralizes a query that would otherwise match every row", () => {
    expect(escapeIlike("%")).not.toBe("%");
  });
});
