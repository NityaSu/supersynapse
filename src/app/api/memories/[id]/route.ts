import { NextResponse } from "next/server";
import { deleteMemory, getMemory, updateMemory } from "@/lib/memories";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const memory = await getMemory(id);

  if (!memory) {
    return NextResponse.json({ error: "memory not found" }, { status: 404 });
  }

  return NextResponse.json({ memory });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();

  const updates: { content?: string; containerTag?: string } = {};
  if (typeof body?.content === "string") updates.content = body.content;
  if (typeof body?.containerTag === "string") {
    updates.containerTag = body.containerTag;
  }

  if (updates.content !== undefined && !updates.content.trim()) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 }
    );
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "content or containerTag is required" },
      { status: 400 }
    );
  }

  const memory = await updateMemory(id, updates);
  if (!memory) {
    return NextResponse.json({ error: "memory not found" }, { status: 404 });
  }

  return NextResponse.json({ memory });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const deleted = await deleteMemory(id);

  if (!deleted) {
    return NextResponse.json({ error: "memory not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
