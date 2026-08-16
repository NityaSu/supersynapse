import { NextResponse } from "next/server";
import { listLatestGraphMemories, listEdgesForMemories } from "@/lib/engine/graph";
import { normalizeSpaceName } from "@/lib/spaces";

/** List latest graph memories for a containerTag. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("containerTag") ?? "default";
  const containerTag = normalizeSpaceName(raw) || "default";

  const memories = listLatestGraphMemories(containerTag);
  const edges = listEdgesForMemories(memories.map((m) => m.id));

  return NextResponse.json({
    containerTag,
    memories: memories.map((m) => ({
      id: m.id,
      content: m.content,
      documentId: m.documentId,
      isLatest: m.isLatest,
      createdAt: m.createdAt,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      fromMemoryId: e.fromMemoryId,
      toMemoryId: e.toMemoryId,
      relation: e.relation,
    })),
  });
}
