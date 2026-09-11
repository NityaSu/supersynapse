import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/auth";
import { searchMemories } from "@/lib/memories";

export async function GET(request: Request) {
  return handleRoute(async () => {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const containerTag = searchParams.get("containerTag") ?? "default";

    const { results, mode } = await searchMemories(q, containerTag);
    return NextResponse.json({ results, mode });
  });
}
