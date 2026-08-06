import { NextResponse } from "next/server";
import { searchMemories } from "@/lib/memories";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const containerTag = searchParams.get("containerTag") ?? "default";

  const results = await searchMemories(q, containerTag);
  return NextResponse.json({ results });
}
