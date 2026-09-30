import { describe, expect, test } from "bun:test";
import {
  EXTEND_THRESHOLD,
  UPDATE_THRESHOLD,
  classifyRelation,
  fallbackFacts,
  parseFactsJson,
} from "@/lib/engine/dream";

describe("classifyRelation", () => {
  test("supersedes the old fact at the update threshold", () => {
    expect(classifyRelation(UPDATE_THRESHOLD)).toBe("updates");
  });

  test("supersedes the old fact above the update threshold", () => {
    expect(classifyRelation(0.97)).toBe("updates");
  });

  test("elaborates the old fact at the extend threshold", () => {
    expect(classifyRelation(EXTEND_THRESHOLD)).toBe("extends");
  });

  test("elaborates the old fact just below the update threshold", () => {
    expect(classifyRelation(UPDATE_THRESHOLD - 0.01)).toBe("extends");
  });

  test("creates a root fact when nothing is close enough", () => {
    expect(classifyRelation(EXTEND_THRESHOLD - 0.01)).toBeNull();
    expect(classifyRelation(0)).toBeNull();
  });

  test("creates a root fact when there was nothing to compare against", () => {
    expect(classifyRelation(null)).toBeNull();
  });

  test("keeps the thresholds ordered so updates is always the stricter test", () => {
    expect(UPDATE_THRESHOLD).toBeGreaterThan(EXTEND_THRESHOLD);
  });
});

describe("parseFactsJson", () => {
  test("parses a plain JSON array of strings", () => {
    expect(parseFactsJson('["User loves Paris", "User works at Acme"]')).toEqual([
      "User loves Paris",
      "User works at Acme",
    ]);
  });

  test("unwraps a fenced json block", () => {
    const raw = '```json\n["User loves Paris"]\n```';
    expect(parseFactsJson(raw)).toEqual(["User loves Paris"]);
  });

  test("unwraps an unlabelled fenced block", () => {
    expect(parseFactsJson('```\n["User loves Paris"]\n```')).toEqual([
      "User loves Paris",
    ]);
  });

  test("ignores commentary around the array", () => {
    const raw = 'Sure! Here are the facts:\n["User loves Paris"]\nHope that helps.';
    expect(parseFactsJson(raw)).toEqual(["User loves Paris"]);
  });

  test("accepts objects with a content field", () => {
    const raw = '[{"content": "User loves Paris"}, {"content": "User ships on Friday"}]';
    expect(parseFactsJson(raw)).toEqual([
      "User loves Paris",
      "User ships on Friday",
    ]);
  });

  test("drops facts too short to be meaningful", () => {
    expect(parseFactsJson('["ok", "User loves Paris"]')).toEqual([
      "User loves Paris",
    ]);
  });

  test("caps the number of facts from one document", () => {
    const many = JSON.stringify(
      Array.from({ length: 40 }, (_, i) => `User fact number ${i}`)
    );
    expect(parseFactsJson(many)).toHaveLength(12);
  });

  test("returns empty for prose with no array", () => {
    expect(parseFactsJson("I could not find any facts.")).toEqual([]);
  });

  test("returns empty for malformed JSON instead of throwing", () => {
    expect(parseFactsJson('["User loves Paris",')).toEqual([]);
  });

  test("salvages the array when the model wraps it in an object", () => {
    expect(parseFactsJson('{"facts": ["User loves Paris"]}')).toEqual([
      "User loves Paris",
    ]);
  });

  test("returns empty when there is no array anywhere in the response", () => {
    expect(parseFactsJson('{"facts": "User loves Paris"}')).toEqual([]);
  });

  test("trims whitespace around facts", () => {
    expect(parseFactsJson('["   User loves Paris   "]')).toEqual([
      "User loves Paris",
    ]);
  });
});

describe("fallbackFacts", () => {
  test("splits prose into sentences when the model is unavailable", () => {
    const content = "User loves Paris. User works at Acme Corp. User ships on Friday.";
    expect(fallbackFacts(content)).toEqual([
      "User loves Paris.",
      "User works at Acme Corp.",
      "User ships on Friday.",
    ]);
  });

  test("splits on question and exclamation marks too", () => {
    expect(fallbackFacts("Where did I put it? I left it on the desk!")).toEqual([
      "Where did I put it?",
      "I left it on the desk!",
    ]);
  });

  test("drops fragments too short to be a fact", () => {
    expect(fallbackFacts("Yes. User works at Acme Corp.")).toEqual([
      "User works at Acme Corp.",
    ]);
  });

  test("caps the number of fallback facts", () => {
    const content = Array.from(
      { length: 20 },
      (_, i) => `User fact number ${i} is written here.`
    ).join(" ");
    expect(fallbackFacts(content)).toHaveLength(8);
  });

  test("returns empty for content with no usable sentence", () => {
    expect(fallbackFacts("hi")).toEqual([]);
  });
});
