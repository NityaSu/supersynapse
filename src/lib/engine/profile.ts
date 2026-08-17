import { listLatestGraphMemories } from "@/lib/engine/graph";
import { normalizeSpaceName } from "@/lib/spaces";

export type ProfileResult = {
  containerTag: string;
  static: string[];
  dynamic: Array<{
    id: string;
    content: string;
    documentId: string | null;
    createdAt: string;
  }>;
};

/**
 * Thin profile stub: dynamic = latest graph facts for the tag.
 * Static stays empty until a richer profile model exists.
 */
export function getProfile(containerTagInput = "default"): ProfileResult {
  const containerTag =
    normalizeSpaceName(containerTagInput) || "default";
  const memories = listLatestGraphMemories(containerTag, 50);

  return {
    containerTag,
    static: [],
    dynamic: memories.map((m) => ({
      id: m.id,
      content: m.content,
      documentId: m.documentId,
      createdAt: m.createdAt,
    })),
  };
}
