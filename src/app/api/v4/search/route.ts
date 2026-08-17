import { NextResponse } from "next/server";
import { searchEngine } from "@/lib/engine/search";

/** POST /v4/search — hybrid retrieval over chunks + graph memories */
export async function POST(request: Request) {
  const body = await request.json();
  const q = body?.q ?? body?.query;

  if (!q || typeof q !== "string" || !q.trim()) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  const containerTag =
    typeof body?.containerTag === "string" ? body.containerTag : "default";
  const limit =
    typeof body?.limit === "number" && body.limit > 0
      ? Math.min(body.limit, 50)
      : 10;

  const result = await searchEngine(q, containerTag, limit);
  return NextResponse.json(result);
}
