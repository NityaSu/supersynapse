import { describe, expect, test } from "bun:test";
import { promoteChunksToFacts } from "@/lib/engine/search";

const facts = [
  {
    id: "fact-mongo",
    content: "We moved to Mongo.",
    containerTag: "work",
    documentId: "doc-2",
  },
  {
    id: "fact-ship",
    content: "User ships on Friday.",
    containerTag: "work",
    documentId: "doc-2",
  },
];

describe("promoteChunksToFacts", () => {
  test("keeps a direct fact hit", () => {
    const hits = promoteChunksToFacts(
      [
        {
          id: "fact-mongo",
          kind: "memory",
          content: "We moved to Mongo.",
          containerTag: "work",
          documentId: "doc-2",
          score: 0.91,
          isLatest: true,
        },
      ],
      facts
    );
    expect(hits).toEqual([
      expect.objectContaining({ id: "fact-mongo", kind: "memory", score: 0.91 }),
    ]);
  });

  test("turns a chunk hit into the document's latest facts", () => {
    const hits = promoteChunksToFacts(
      [
        {
          id: "chunk-1",
          kind: "chunk",
          content: "we moved from Postgres to Mongo last quarter",
          containerTag: "work",
          documentId: "doc-2",
          score: 0.77,
        },
      ],
      facts
    );
    expect(hits.map((hit) => hit.id).sort()).toEqual(["fact-mongo", "fact-ship"]);
    expect(hits.every((hit) => hit.kind === "memory" && hit.score === 0.77)).toBe(
      true
    );
  });

  test("drops a chunk whose document has no latest facts", () => {
    const hits = promoteChunksToFacts(
      [
        {
          id: "chunk-old",
          kind: "chunk",
          content: "we use Postgres",
          containerTag: "work",
          documentId: "doc-1",
          score: 0.8,
        },
      ],
      facts
    );
    expect(hits).toEqual([]);
  });

  test("does not emit raw chunk ids", () => {
    const hits = promoteChunksToFacts(
      [
        {
          id: "chunk-1",
          kind: "chunk",
          content: "raw",
          containerTag: "work",
          documentId: "doc-2",
          score: 0.6,
        },
      ],
      facts
    );
    expect(hits.some((hit) => hit.kind === "chunk")).toBe(false);
  });
});
