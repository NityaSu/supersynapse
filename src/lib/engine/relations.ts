/**
 * Attach graph edges onto facts so the UI can say "this replaced that"
 * without knowing how dreaming stored the link.
 */

export type RelatableFact = {
  id: string;
  content: string;
};

export type RelationEdge = {
  fromMemoryId: string;
  toMemoryId: string;
  relation: string;
};

export type AttachedRelation = {
  relation: "updates" | "extends" | null;
  replaces: { id: string; content: string } | null;
};

function isLink(relation: string): relation is "updates" | "extends" {
  return relation === "updates" || relation === "extends";
}

/**
 * For each new fact, keep the strongest outgoing link (updates beats extends).
 * `replaces` is the older fact that link points at.
 */
export function attachRelations<T extends RelatableFact>(
  facts: T[],
  edges: RelationEdge[],
  targets: Array<{ id: string; content: string }>
): Array<T & AttachedRelation> {
  const factIds = new Set(facts.map((fact) => fact.id));
  const byFrom = new Map<string, RelationEdge>();

  for (const edge of edges) {
    if (!factIds.has(edge.fromMemoryId) || !isLink(edge.relation)) continue;
    const prev = byFrom.get(edge.fromMemoryId);
    if (!prev || (edge.relation === "updates" && prev.relation !== "updates")) {
      byFrom.set(edge.fromMemoryId, edge);
    }
  }

  const targetById = new Map(targets.map((target) => [target.id, target]));

  return facts.map((fact) => {
    const edge = byFrom.get(fact.id);
    const target = edge ? targetById.get(edge.toMemoryId) : undefined;
    return {
      ...fact,
      relation: edge && isLink(edge.relation) ? edge.relation : null,
      replaces: target
        ? { id: target.id, content: target.content }
        : null,
    };
  });
}
