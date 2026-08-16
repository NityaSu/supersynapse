import { NextResponse } from "next/server";
import {
  getDocument,
  listDocumentChunks,
} from "@/lib/engine/documents";
import { getDocumentDreamView } from "@/lib/engine/dream";

type RouteContext = { params: Promise<{ id: string }> };

/** Contract: GET /v3/documents/:id */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const document = getDocument(id);

  if (!document) {
    return NextResponse.json({ error: "document not found" }, { status: 404 });
  }

  const chunks = listDocumentChunks(id).map((c) => ({
    id: c.id,
    position: c.position,
    content: c.content,
    hasEmbedding: Boolean(c.embedding),
  }));

  const { memories, edges } = getDocumentDreamView(id);

  return NextResponse.json({
    document,
    chunks,
    memories: memories.map((m) => ({
      id: m.id,
      content: m.content,
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
