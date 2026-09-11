import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/auth";
import { listLatestGraphMemories, listEdgesForMemories } from "@/lib/engine/graph";
import { normalizeSpaceName } from "@/lib/spaces";

/** List latest graph memories for a containerTag. */
export async function GET(request: Request) {
  return handleRoute(async () => {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("containerTag") ?? "default";
    const containerTag = normalizeSpaceName(raw) || "default";

    const memories = await listLatestGraphMemories(containerTag);
    const edges = await listEdgesForMemories(memories.map((m) => m.id));

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
  });
}
