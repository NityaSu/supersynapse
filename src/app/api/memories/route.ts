import { NextResponse } from "next/server";
import { addMemory, listMemories } from "@/lib/memories";

export async function GET() {
  const memories = await listMemories();
  return NextResponse.json({ memories });
}

export async function POST(request: Request) {
  const body = await request.json();
  const content = body?.content;

  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 }
    );
  }

  const memory = await addMemory(content);
  return NextResponse.json({ memory }, { status: 201 });
}
