import { NextResponse } from "next/server";
import {
  getDocument,
  listDocumentChunks,
} from "@/lib/engine/documents";

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

  return NextResponse.json({ document, chunks });
}
