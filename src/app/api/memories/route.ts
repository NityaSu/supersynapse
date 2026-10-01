import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/auth";
import { ingestThought } from "@/lib/engine/documents";
import { listMemories } from "@/lib/memories";

export async function GET(request: Request) {
  return handleRoute(async () => {
    const { searchParams } = new URL(request.url);
    const containerTag = searchParams.get("containerTag") ?? "default";
    const memories = await listMemories(containerTag);
    return NextResponse.json({ memories });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = await request.json();
    const content = body?.content;
    const containerTag =
      typeof body?.containerTag === "string" ? body.containerTag : "default";

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    const { document, facts } = await ingestThought({ content, containerTag });
    if (document.status === "failed") {
      return NextResponse.json(
        { error: document.error ?? "ingest failed", facts: [] },
        { status: 500 }
      );
    }

    const first = facts[0];
    return NextResponse.json(
      {
        memory: first
          ? {
              id: first.id,
              content: first.content,
              containerTag,
              createdAt: first.createdAt,
            }
          : {
              id: document.id,
              content: content.trim(),
              containerTag,
              createdAt: document.createdAt,
            },
        facts,
        extracted: facts.length,
      },
      { status: 201 }
    );
  });
}
