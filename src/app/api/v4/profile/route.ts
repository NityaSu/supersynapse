import { NextResponse } from "next/server";
import { getProfile } from "@/lib/engine/profile";

/** POST /v4/profile — latest graph facts for a containerTag (stub) */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const containerTag =
    typeof body?.containerTag === "string" ? body.containerTag : "default";

  const profile = getProfile(containerTag);
  return NextResponse.json(profile);
}
