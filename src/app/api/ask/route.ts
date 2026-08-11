import { NextResponse } from "next/server";
import { askMemories } from "@/lib/ask";

export async function POST(request: Request) {
  const body = await request.json();
  const question = body?.question;
  const containerTag =
    typeof body?.containerTag === "string" ? body.containerTag : "default";

  if (!question || typeof question !== "string" || !question.trim()) {
    return NextResponse.json(
      { error: "question is required" },
      { status: 400 }
    );
  }

  const result = await askMemories(question, containerTag);
  return NextResponse.json(result);
}
