import { NextResponse } from "next/server";
import { searchMemories } from "@/lib/memories";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const results = await searchMemories(q);
  return NextResponse.json({ results });
}
