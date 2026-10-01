import { describe, expect, test } from "bun:test";
import { attachRelations } from "@/lib/engine/relations";

const facts = [
  { id: "new", content: "We moved to Mongo." },
  { id: "other", content: "User ships on Friday." },
];

describe("attachRelations", () => {
  test("labels a fact that supersedes an older one", () => {
    const [updated] = attachRelations(
      facts,
      [{ fromMemoryId: "new", toMemoryId: "old", relation: "updates" }],
      [{ id: "old", content: "We use Postgres." }]
    );
    expect(updated.relation).toBe("updates");
    expect(updated.replaces).toEqual({
      id: "old",
      content: "We use Postgres.",
    });
  });

  test("labels a fact that elaborates an older one", () => {
    const [extended] = attachRelations(
      facts,
      [{ fromMemoryId: "new", toMemoryId: "old", relation: "extends" }],
      [{ id: "old", content: "We use Postgres." }]
    );
    expect(extended.relation).toBe("extends");
    expect(extended.replaces?.content).toBe("We use Postgres.");
  });

  test("prefers updates when both links exist", () => {
    const [updated] = attachRelations(
      facts,
      [
        { fromMemoryId: "new", toMemoryId: "a", relation: "extends" },
        { fromMemoryId: "new", toMemoryId: "b", relation: "updates" },
      ],
      [
        { id: "a", content: "A" },
        { id: "b", content: "B" },
      ]
    );
    expect(updated.relation).toBe("updates");
    expect(updated.replaces?.id).toBe("b");
  });

  test("leaves unrelated facts without a badge", () => {
    const attached = attachRelations(facts, [], []);
    expect(attached[0].relation).toBeNull();
    expect(attached[1].replaces).toBeNull();
  });

  test("ignores edges that do not start from a returned fact", () => {
    const attached = attachRelations(
      facts,
      [{ fromMemoryId: "ghost", toMemoryId: "old", relation: "updates" }],
      [{ id: "old", content: "We use Postgres." }]
    );
    expect(attached.every((fact) => fact.relation === null)).toBe(true);
  });
});
