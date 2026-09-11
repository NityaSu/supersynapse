import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ConfigError } from "@/lib/supabase/env";

export class UnauthorizedError extends Error {
  constructor() {
    super("sign in required");
    this.name = "UnauthorizedError";
  }
}

export async function requireUser(): Promise<{
  supabase: SupabaseClient;
  user: User;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new UnauthorizedError();
  return { supabase, user: data.user };
}

export function jsonError(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }
  if (err instanceof ConfigError) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
  const message = err instanceof Error ? err.message : "request failed";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function handleRoute(
  fn: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    return jsonError(err);
  }
}
