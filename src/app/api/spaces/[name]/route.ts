import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/auth";
import { deleteSpace } from "@/lib/spaces";

type RouteContext = { params: Promise<{ name: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  return handleRoute(async () => {
    const { name } = await context.params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    const result = await deleteSpace(decodeURIComponent(name), { force });
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({ ok: true });
  });
}
