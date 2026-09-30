import { describe, expect, test } from "bun:test";
import { normalizeSpaceName } from "@/lib/spaces";

describe("normalizeSpaceName", () => {
  test("lowercases", () => {
    expect(normalizeSpaceName("Work")).toBe("work");
  });

  test("trims surrounding whitespace", () => {
    expect(normalizeSpaceName("  work  ")).toBe("work");
  });

  test("turns inner whitespace into hyphens", () => {
    expect(normalizeSpaceName("side projects")).toBe("side-projects");
  });

  test("collapses runs of whitespace into one hyphen", () => {
    expect(normalizeSpaceName("side    projects")).toBe("side-projects");
  });

  test("collapses runs of hyphens", () => {
    expect(normalizeSpaceName("side---projects")).toBe("side-projects");
  });

  test("strips leading and trailing hyphens", () => {
    expect(normalizeSpaceName("-work-")).toBe("work");
  });

  test("keeps digits and underscores", () => {
    expect(normalizeSpaceName("q3_2026")).toBe("q3_2026");
  });

  test("drops characters that have no place in a tag", () => {
    expect(normalizeSpaceName("work/life?")).toBe("worklife");
  });

  test("drops emoji and non-latin characters", () => {
    expect(normalizeSpaceName("work 🚀")).toBe("work");
  });

  test("returns empty for input with nothing usable, so callers can reject it", () => {
    expect(normalizeSpaceName("???")).toBe("");
    expect(normalizeSpaceName("   ")).toBe("");
    expect(normalizeSpaceName("")).toBe("");
  });

  test("is idempotent", () => {
    const once = normalizeSpaceName("My Side Projects!");
    expect(normalizeSpaceName(once)).toBe(once);
  });

  test("maps names differing only in case or spacing to the same tag", () => {
    expect(normalizeSpaceName("Side Projects")).toBe(
      normalizeSpaceName("side   projects")
    );
  });
});
