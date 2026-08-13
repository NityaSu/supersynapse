import { NextResponse } from "next/server";
import { createSpace, listSpaces } from "@/lib/spaces";

export async function GET() {
  return NextResponse.json({ spaces: listSpaces() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = body?.name;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const result = createSpace(name);
  if ("error" in result) {
    const status = result.error === "space already exists" ? 409 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ space: result.space }, { status: 201 });
}
