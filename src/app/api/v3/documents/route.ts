import { NextResponse } from "next/server";
import { createDocument } from "@/lib/engine/documents";

/**
 * Contract: POST /v3/documents
 * Body: { content, containerTag?, title?, metadata? }
 */
export async function POST(request: Request) {
  const body = await request.json();
  const content = body?.content;

  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 }
    );
  }

  const containerTag =
    typeof body?.containerTag === "string" ? body.containerTag : "default";
  const title = typeof body?.title === "string" ? body.title : undefined;
  const metadata =
    body?.metadata && typeof body.metadata === "object"
      ? (body.metadata as Record<string, string | number | boolean>)
      : undefined;

  try {
    const document = await createDocument({
      content,
      containerTag,
      title,
      metadata,
    });
    return NextResponse.json({ id: document.id, status: document.status }, {
      status: 201,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
