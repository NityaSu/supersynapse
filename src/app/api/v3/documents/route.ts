import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/auth";
import { ingestThought } from "@/lib/engine/documents";

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

    const { document, facts } = await ingestThought({
      content,
      containerTag,
      title,
      metadata,
    });

    if (document.status === "failed") {
      return NextResponse.json(
        {
          error: document.error ?? "ingest failed",
          id: document.id,
          status: document.status,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        id: document.id,
        status: document.status,
        extracted: facts.length,
        facts,
      },
      { status: 201 }
    );
  });
}
