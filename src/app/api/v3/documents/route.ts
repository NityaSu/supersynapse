import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/auth";
import { createDocument } from "@/lib/engine/documents";

/** Contract: POST /v3/documents */
export async function POST(request: Request) {
  return handleRoute(async () => {
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

    const document = await createDocument({
      content,
      containerTag,
      title,
      metadata,
    });
    return NextResponse.json({ id: document.id, status: document.status }, {
      status: 201,
    });
  });
}
