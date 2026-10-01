import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/auth";
import { listFactMemories } from "@/lib/engine/graph";
import { normalizeSpaceName } from "@/lib/spaces";

/** List latest graph memories for a containerTag. */
export async function GET(request: Request) {
  return handleRoute(async () => {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("containerTag") ?? "default";
    const containerTag = normalizeSpaceName(raw) || "default";

    const memories = await listFactMemories(containerTag);

    return NextResponse.json({
      containerTag,
      memories: memories.map((m) => ({
        id: m.id,
        content: m.content,
        containerTag: m.containerTag,
        documentId: m.documentId,
        isLatest: m.isLatest,
        createdAt: m.createdAt,
        relation: m.relation,
        replaces: m.replaces,
        source: m.source,
      })),
    });
  });
}
