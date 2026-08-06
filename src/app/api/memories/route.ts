import { NextResponse } from "next/server";
import { addMemory, listMemories } from "@/lib/memories";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const containerTag = searchParams.get("containerTag") ?? "default";
  const memories = await listMemories(containerTag);
  return NextResponse.json({ memories });
}

export async function POST(request: Request) {
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

  const memory = await addMemory(content, containerTag);
  return NextResponse.json({ memory }, { status: 201 });
}
