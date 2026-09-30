import { describe, expect, test } from "bun:test";
import {
  SCORE_FLOOR,
  keywordScore,
  mergeByBestScore,
  resolveMode,
} from "@/lib/rank";

type Hit = { id: string; score: number };

const hits = (...entries: Array<[string, number]>): Hit[] =>
  entries.map(([id, score]) => ({ id, score }));

const byId = (hit: Hit) => hit.id;
const byScore = (hit: Hit) => hit.score;

describe("keywordScore", () => {
  test("scores an exact match highest", () => {
    expect(keywordScore("deploy on friday", "deploy on friday")).toBe(1);
  });

  test("scores a substring match below an exact match", () => {
    expect(keywordScore("we deploy on friday", "deploy")).toBe(0.9);
  });

  test("returns 0 when the query is absent so callers can filter it out", () => {
    expect(keywordScore("we deploy on friday", "postgres")).toBe(0);
  });

  test("is case insensitive on the content side", () => {
    expect(keywordScore("Deploy On Friday", "deploy on friday")).toBe(1);
  });

  test("returns 0 for an empty query rather than matching everything", () => {
    expect(keywordScore("anything at all", "")).toBe(0);
  });

  test("every non-zero score clears the floor", () => {
    expect(keywordScore("we deploy on friday", "deploy")).toBeGreaterThanOrEqual(
      SCORE_FLOOR
    );
  });
});

describe("mergeByBestScore", () => {
  test("keeps the highest score when the same id comes from both paths", () => {
    const merged = mergeByBestScore(
      hits(["a", 0.4], ["a", 0.91]),
      byId,
      byScore
    );
    expect(merged).toEqual([{ id: "a", score: 0.91 }]);
  });

  test("keeps the highest score regardless of arrival order", () => {
    const merged = mergeByBestScore(
      hits(["a", 0.91], ["a", 0.4]),
      byId,
      byScore
    );
    expect(merged).toEqual([{ id: "a", score: 0.91 }]);
  });

  test("sorts distinct hits by score descending", () => {
    const merged = mergeByBestScore(
      hits(["low", 0.3], ["high", 0.95], ["mid", 0.6]),
      byId,
      byScore
    );
    expect(merged.map(byId)).toEqual(["high", "mid", "low"]);
  });

  test("keeps ties in insertion order", () => {
    const merged = mergeByBestScore(hits(["first", 0.5], ["second", 0.5]), byId, byScore);
    expect(merged.map(byId)).toEqual(["first", "second"]);
  });

  test("returns an empty array for no hits", () => {
    expect(mergeByBestScore([], byId, byScore)).toEqual([]);
  });

  test("treats different keys as different hits even with equal scores", () => {
    const merged = mergeByBestScore(hits(["a", 0.7], ["b", 0.7]), byId, byScore);
    expect(merged).toHaveLength(2);
  });
});

describe("resolveMode", () => {
  const keyword = new Set(["k1", "shared"]);
  const semantic = new Set(["s1", "shared"]);

  test("reports hybrid when both paths reach the results", () => {
    expect(resolveMode(["k1", "s1"], keyword, semantic)).toBe("hybrid");
  });

  test("reports hybrid when one hit was found by both paths", () => {
    expect(resolveMode(["shared"], keyword, semantic)).toBe("hybrid");
  });

  test("reports semantic when only vector hits survived", () => {
    expect(resolveMode(["s1"], keyword, semantic)).toBe("semantic");
  });

  test("reports keyword when only keyword hits survived", () => {
    expect(resolveMode(["k1"], keyword, semantic)).toBe("keyword");
  });

  test("does not credit a path whose hits were all outscored", () => {
    // The semantic path ran and returned s1, but s1 did not make the final cut.
    expect(resolveMode(["k1"], keyword, semantic)).toBe("keyword");
  });

  test("falls back to keyword for empty results", () => {
    expect(resolveMode([], keyword, semantic)).toBe("keyword");
  });
});
