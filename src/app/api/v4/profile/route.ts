import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/auth";
import { getProfile } from "@/lib/engine/profile";

/** POST /v4/profile — latest graph facts for a containerTag (stub) */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = await request.json().catch(() => ({}));
    const containerTag =
      typeof body?.containerTag === "string" ? body.containerTag : "default";

    const profile = await getProfile(containerTag);
    return NextResponse.json(profile);
  });
}
